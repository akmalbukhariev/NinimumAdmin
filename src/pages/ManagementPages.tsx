import {CourierDispatchSettings} from '../components/CourierDispatchSettings';
import {LoginAudit} from '../components/LoginAudit';
import { ProductPriceHistory } from '../components/ProductPriceHistory';
import { TariffBenefits } from '../components/TariffBenefits';
import { ProductMetadataFields, metadataValues } from '../components/ProductMetadataFields';
import { ListExcelExport } from '../components/ListExcelExport';
import { createAccountWorkbook } from '../utils/accountWorkbook';
import { CustomerCard } from '../components/CustomerCard';
import { CustomerDuplicates } from '../components/CustomerDuplicates';
import PartialReturnNotice from '../components/PartialReturnNotice';
import ReturnEvidence, { readReturnPhoto } from '../components/ReturnEvidence';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TimerSettings } from '../components/OrderProblems';
import type { UIEvent } from 'react';
import { Alert, Autocomplete, Avatar, Backdrop, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Select, Stack, Switch, Tab, Table, TableBody, TableContainer, TableCell, TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import DeleteRounded from '@mui/icons-material/DeleteRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import { useAuth } from '../auth/AuthProvider';
import { LoadState, PageTitle, Panel, StatusChip, TablePanel, dateTime, money, useConfirm, useEnumLabel, useL } from '../components/AdminCommon';
import * as api from '../api/managementApi';
import type { Row } from '../api/managementApi';
import { OrderPayments } from '../components/OrderPayments';
import { RefundNotice } from '../components/RefundNotice';
import { createOrderWorkbook } from '../utils/orderWorkbook';
import { collectProducts, createProductWorkbook } from '../utils/productWorkbook';
import { warehouseStatus } from '../api/warehouseApi';

const useToken = () => useAuth().accessToken!;
const emptyPage = { items: [] as Row[], total: 0, page: 1, page_size: 20 };
const MXIK_PAGE_SIZE = 20;
function usePaged(loader:(page:number,pageSize:number)=>Promise<api.PageData>) {
  const l=useL();
  const [data,setData]=useState(emptyPage), [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null);
  const [page,setPage]=useState(0), [pageSize,setPageSize]=useState(20);
  const generation=useRef(0);
  const previousLoader=useRef(loader);
  const reload=useCallback(async()=>{
    const request=++generation.current;
    if(previousLoader.current!==loader){previousLoader.current=loader;if(page!==0){setPage(0);return;}}
    setLoading(true);setError(null);
    try{const result=await loader(page+1,pageSize);if(request===generation.current)setData(result);}
    catch(e){if(request===generation.current)setError(e instanceof Error?e.message:'Error');}
    finally{if(request===generation.current)setLoading(false);}
  },[loader,page,pageSize]);
  useEffect(()=>{void reload();return()=>{generation.current++;}},[reload]);
  const pagination=<TablePagination component="div" count={data.total} page={page} rowsPerPage={pageSize} onPageChange={(_,p)=>setPage(p)} onRowsPerPageChange={e=>{setPage(0);setPageSize(Number(e.target.value));}} rowsPerPageOptions={[10,20,50,100]} labelRowsPerPage={l('Sahifadagi qatorlar:','Строк на странице:','Rows per page:')} labelDisplayedRows={({from,to,count})=>`${from}–${to} / ${count!==-1?count:`>${to}`}`} />;
  const updateItem=useCallback((id:number, updater:(row:Row)=>Row)=>{setData(current=>({...current,items:current.items.map(row=>Number(row.id)===id?updater(row):row)}));},[]);
  const removeItem=useCallback((id:number)=>{setData(current=>({...current,items:current.items.filter(row=>Number(row.id)!==id),total:Math.max(0,current.total-1)}));},[]);
  return {data,loading,error,reload,pagination,updateItem,removeItem};
}

function SelectedImageThumbnail({ file, removeLabel, onRemove }: { file: File; removeLabel: string; onRemove: () => void }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return <Box sx={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
    <Avatar variant="rounded" src={src} alt={file.name} sx={{ width: 104, height: 104, bgcolor: 'grey.100' }} />
    <Tooltip title={removeLabel}>
      <IconButton
        size="small"
        color="error"
        onClick={onRemove}
        sx={{
          position: 'absolute', top: 4, right: 4, width: 28, height: 28,
          bgcolor: 'rgba(255,255,255,.96)', border: '1px solid', borderColor: 'divider', boxShadow: 1,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <DeleteRounded sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  </Box>;
}

export function OrdersPage(){
  const [query]=useSearchParams();
  const {admin}=useAuth(); const token=useToken(), l=useL(), enumLabel=useEnumLabel(); const { confirm, confirmDialog }=useConfirm(); const [search,setSearch]=useState(''),[status,setStatus]=useState('');
  const [paymentStatus,setPaymentStatus]=useState(''),[dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState('');
  const invalidDates=Boolean(dateFrom&&dateTo&&dateFrom>dateTo);
  const loader=useCallback((p:number,s:number)=>{
    if(dateFrom&&dateTo&&dateFrom>dateTo)return Promise.reject(new Error(l('Sana oralig‘i noto‘g‘ri.','Неверный диапазон дат.','Invalid date range.')));
    return api.listOrders(token,{page:p,page_size:s,search,status,payment_status:paymentStatus,date_from:dateFrom,date_to:dateTo});
  },[token,search,status,paymentStatus,dateFrom,dateTo]);
  const x=usePaged(loader); const [detail,setDetail]=useState<Row|null>(null),[edit,setEdit]=useState<Row|null>(null);
  const [detailId,setDetailId]=useState<number|null>(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState<string|null>(null);
  const [exportingOrders,setExportingOrders]=useState(false),[orderExportError,setOrderExportError]=useState<string|null>(null);
  const orderExportBusy=useRef(false);
  const exportOrders=async()=>{
    if(orderExportBusy.current)return;
    orderExportBusy.current=true;setExportingOrders(true);setOrderExportError(null);
    try {
      const rows=await collectProducts(loader);
      const book=await createOrderWorkbook(rows,l,enumLabel,{search,status,payment_status:paymentStatus,date_from:dateFrom,date_to:dateTo});
      const buffer=await book.xlsx.writeBuffer();
      const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const link=document.createElement('a');link.href=url;link.download='orders.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setOrderExportError(l('Eksport bajarilmadi. Qayta urinib ko‘ring yoki filtr orqali 50 000 tagacha kamaytiring.','Экспорт не выполнен. Повторите или сократите выборку фильтрами до 50 000 заказов.','Export failed. Retry or narrow the filters to at most 50,000 orders.'));}
    finally{orderExportBusy.current=false;setExportingOrders(false);}
  };
  const detailRequest=useRef(0);
  useEffect(()=>{const timer=window.setInterval(()=>void x.reload(),60000);return ()=>window.clearInterval(timer);},[x.reload]);
  const [correction,setCorrection]=useState<Row|null>(null),[correctionBusy,setCorrectionBusy]=useState(false),[correctionError,setCorrectionError]=useState<string|null>(null);
  const correctionStages=['CONFIRMED','PREPARING','READY','ON_THE_WAY','DELIVERED'];
  const correct=async()=>{
    if(!correction||correctionBusy)return;
    const ok=await confirm({message:l('Holatni orqaga qaytarish tayyorlashni qayta boshlashi yoki kuryer biriktirilishini olib tashlashi mumkin. Davom etasizmi?','Возврат статуса может перезапустить подготовку или снять назначение курьера. Продолжить?','Moving back may restart preparation or remove the courier assignment. Continue?')});if(!ok)return;
    setCorrectionBusy(true);setCorrectionError(null);
    try {await api.correctOrderStatus(token,correction.id,{status:correction.status,expected_status:correction.original_status,reason:correction.reason});setCorrection(null);await x.reload();await openDetail(correction.id);}
    catch(e){setCorrectionError(e instanceof Error?e.message:l('Amal bajarilmadi.','Действие не выполнено.','Action failed.'));}
    finally{setCorrectionBusy(false);}
  };

  const openDetail=async(id:number)=>{
    const request=++detailRequest.current; setDetailId(id);setDetail(null);setDetailLoading(true);setDetailError(null);
    try {const result=await api.getOrder(token,id);if(request===detailRequest.current)setDetail(result);}
    catch(error){if(request===detailRequest.current)setDetailError(error instanceof Error?error.message:l('Ma’lumotlarni yuklab bo‘lmadi.','Не удалось загрузить данные.','Could not load details.'));}
    finally {if(request===detailRequest.current)setDetailLoading(false);}
  };
  useEffect(()=>{const id=Number(query.get('order'));if(Number.isSafeInteger(id)&&id>0)void openDetail(id);},[query,token]);
  const historyReason=(entry:Row)=> {
    if(entry.source==='AUTO_EXPIRE' && entry.reason==='UNPAID_PAYMENT_TIMEOUT') return l('To‘lov muddati tugadi','Срок оплаты истёк','Payment time limit expired');
    if(entry.source==='WAREHOUSE_RETURN' && entry.reason==='Returned products received and checked')
      return l('Qaytgan mahsulotlar qabul qilindi va tekshirildi.','Возвращённые товары приняты и проверены.','Returned products received and checked.');
    return entry.reason||'—';
  };
  const historySource=(source:string)=>{const labels:Record<string,string>={
    AUTO_EXPIRE:l('Tizim: to‘lov muddati tugadi','Система: срок оплаты истёк','System: payment time expired'),
    OWNER_CORRECTION:l('Egasi: holatni tuzatish','Владелец: исправление статуса','Owner: status correction'),
    WAREHOUSE_RETURN:l('Ombor: qaytarish qabul qilindi','Склад: возврат принят','Warehouse: return received'),
    RETURN_REPAIR:l('Qaytarish holatini tiklash','Исправление статуса возврата','Return status repair'),
    BASELINE:l('Boshlang‘ich holat','Начальное состояние','Baseline'),
    CREATED:l('Mijoz','Клиент','Customer'),CUSTOMER:l('Mijoz','Клиент','Customer'),
    WAREHOUSE:l('Ombor','Склад','Warehouse'),OWNER_RESET:l('Egasi: qayta tayyorlash','Владелец: повторная подготовка','Owner: restart preparation'),
    COURIER:l('Kuryer','Курьер','Courier'),COURIER_SYNC:l('Kuryer','Курьер','Courier'),
    ADMIN:l('Administrator','Администратор','Administrator'),PAYMENT:l('To‘lov tizimi','Платёжная система','Payment provider'),SYSTEM:l('Tizim','Система','System'),
  };return labels[source]||l('Tizim','Система','System');};
  const closeDetail=()=>{detailRequest.current++;setDetailId(null);setDetail(null);setDetailLoading(false);setDetailError(null);};
  const save=async()=>{if(!edit)return; const ok=await confirm({message:l('Buyurtma va to‘lov holatini o‘zgartirishga ishonchingiz komilmi?','Вы уверены, что хотите изменить статус заказа и оплаты?','Are you sure you want to change the order and payment status?')}); if(!ok)return; try {await api.updateOrderStatus(token,edit.id,{status:edit.status,cancel_reason:edit.cancel_reason});setEdit(null);await x.reload();if(edit.status==='CANCELLED')await openDetail(edit.id);} catch {window.alert(l("Amal bajarilmadi. Bekor qilish sababini kiriting va buyurtma holatini tekshiring.","Действие не выполнено. Укажите причину отмены и проверьте статус заказа.","Action failed. Enter a cancellation reason and check the order status."));}};
  return <><PageTitle title={l('Buyurtmalar','Заказы','Orders')} subtitle={l('Buyurtmalar, to‘lov va holatlarni boshqaring.','Управляйте заказами, оплатой и статусами.','Manage orders, payments and statuses.')} />
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mb:3}}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)} /><TextField select size="small" label={l('Holat','Статус','Status')} value={status} onChange={e=>setStatus(e.target.value)} sx={{minWidth:180}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['PENDING','CONFIRMED','PREPARING','READY','ON_THE_WAY','RETURNING','RETURNED','DELIVERED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField><Button onClick={x.reload} startIcon={<RefreshRounded/>}>{l('Yangilash','Обновить','Refresh')}</Button></Stack>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mb:3,flexWrap:'wrap'}}>
      <TextField select size="small" label={l('To‘lov holati','Статус оплаты','Payment status')} value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} sx={{minWidth:190}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['PENDING','PAID','FAILED','REFUNDED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField>
      <TextField type="date" size="small" label={l('Buyurtma sanasi: dan','Дата заказа: с','Order date: from')} value={dateFrom} error={invalidDates} slotProps={{inputLabel:{shrink:true}}} onChange={e=>setDateFrom(e.target.value)}/>
      <TextField type="date" size="small" label={l('Gacha (shu kun ham)','По (включительно)','Through (inclusive)')} value={dateTo} error={invalidDates} slotProps={{inputLabel:{shrink:true}}} onChange={e=>setDateTo(e.target.value)}/>
      <Button onClick={()=>{setSearch('');setStatus('');setPaymentStatus('');setDateFrom('');setDateTo('')}}>{l('Filtrlarni tozalash','Сбросить фильтры','Clear filters')}</Button>
    </Stack>
    <Button disabled={exportingOrders||x.loading||invalidDates} onClick={()=>void exportOrders()} sx={{mb:2}}>{exportingOrders?l('Yuklanmoqda…','Загрузка…','Exporting…'):l('Excel — barcha natijalar','Excel — все результаты','Excel — all results')}</Button>
    {orderExportError&&<Alert severity="error" sx={{mb:2}} onClose={()=>setOrderExportError(null)}>{orderExportError}</Alert>}
    <Typography variant="caption" sx={{display:'block',mb:2,color:'text.secondary'}}>{l('Sanalar Toshkent vaqti bo‘yicha.','Даты по ташкентскому времени.','Dates use Tashkent time.')}</Typography>
    <LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table sx={{'& .MuiTableCell-root':{whiteSpace:'nowrap',verticalAlign:'middle'},'& .MuiTableCell-head':{py:2},'& .MuiTableCell-body':{py:2}}}><TableHead><TableRow><TableCell>{l('Buyurtma №','Заказ №','Order №')}</TableCell><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Mahsulot','Товары','Items')}</TableCell><TableCell>{l('Summa','Сумма','Total')}</TableCell><TableCell>{l('To‘lov','Оплата','Payment')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell>{l('Vaqt','Время','Time')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id} hover><TableCell sx={{whiteSpace:'nowrap'}}><Button size="small" variant="outlined" startIcon={<VisibilityRounded/>} onClick={()=>void openDetail(r.id)} aria-label={`${l('Buyurtma','Заказ','Order')} №${r.id}: ${l('Tafsilotlar','Подробности','Details')}`}>№{r.id} · {l('Tafsilotlar','Подробности','Details')}</Button></TableCell><TableCell>{r.customer_name||r.phone_number||'-'}</TableCell><TableCell>{r.product_count}</TableCell><TableCell>{money(r.total_price)}</TableCell><TableCell><Stack direction="row" sx={{alignItems:'center',gap:1}}><StatusChip value={r.payment_status}/><RefundNotice order={r} compact/></Stack></TableCell><TableCell><StatusChip value={r.status}/>{r.partial_return_status&&<Typography variant="caption" sx={{display:'block'}}>{l('Qisman qaytarish','Частичный возврат','Partial return')}</Typography>}</TableCell><TableCell>{dateTime(r.ordered_at)}</TableCell><TableCell><Stack direction="row" sx={{alignItems:'center',gap:0.5}}><Tooltip title={l('Ko‘rish','Просмотр','View')}><IconButton onClick={()=>void openDetail(r.id)}><VisibilityRounded/></IconButton></Tooltip><IconButton onClick={()=>setEdit({...r,original_status:r.status})}><EditRounded/></IconButton></Stack></TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState>
    <Dialog open={!!edit} onClose={()=>setEdit(null)} fullWidth maxWidth="xs"><DialogTitle>{l('Buyurtma holati','Статус заказа','Order status')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><Alert severity="info">{l('Tayyorlash va yetkazish holati ombor va kuryer ilovalarida yangilanadi. Bu yerda buyurtmani bekor qilish mumkin.','Статусы подготовки и доставки обновляются в приложениях склада и курьера. Здесь можно отменить заказ.','Preparation and delivery statuses are updated by the warehouse and courier apps. You can cancel an order here.')}</Alert><Alert severity="warning">{l('Bu yerda holatni o‘zgartirish pulni qaytarmaydi. To‘lovni Payme Business’da bekor qiling.','Изменение статуса здесь не возвращает деньги. Отмените платёж в Payme Business.','Changing a status here does not refund money. Cancel the payment in Payme Business.')}</Alert><TextField select label={l('Buyurtma holati','Статус заказа','Order status')} value={edit?.status||''} onChange={e=>setEdit(v=>v&&({...v,status:e.target.value}))}>{[edit?.original_status,...(['PENDING','CONFIRMED','PREPARING','READY'].includes(edit?.original_status)?['CANCELLED']:[])].filter(Boolean).map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField>{edit?.status==='CANCELLED'&&<TextField required multiline label={l('Bekor qilish sababi','Причина отмены','Cancellation reason')} value={edit?.cancel_reason||''} onChange={e=>setEdit(v=>v&&({...v,cancel_reason:e.target.value}))}/>}</Stack></DialogContent><DialogActions><Button onClick={()=>setEdit(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={edit?.status===edit?.original_status} onClick={()=>void save()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
    <Dialog open={!!correction} onClose={()=>{if(!correctionBusy)setCorrection(null);}} fullWidth maxWidth="sm"><DialogTitle>{l('Egasi: holatni tuzatish','Владелец: исправление статуса','Owner: status correction')} №{correction?.id}</DialogTitle><DialogContent><Stack sx={{gap:2,pt:1}}><Alert severity="warning">{l('Faqat oldingi bosqichga qaytariladi. Tayyorlashga qaytish mahsulot tekshiruvini qayta boshlaydi. Tayyor yoki undan oldingi bosqichga qaytish kuryer biriktirilishini olib tashlaydi. To‘lov o‘zgarmaydi.','Только возврат на предыдущий этап. Возврат к подготовке требует повторной проверки товаров. Возврат к готовности или раньше снимает назначение курьера. Оплата не меняется.','Only earlier stages are allowed. Returning to preparation requires product checks again. Returning to Ready or earlier removes the courier assignment. Payment stays unchanged.')}</Alert><Typography>{l('Hozirgi holat','Текущий статус','Current status')}: {enumLabel(correction?.original_status)}</Typography>{correctionError&&<Alert severity="error">{correctionError}</Alert>}<TextField select required label={l('Yangi holat','Новый статус','New status')} value={correction?.status||''} disabled={correctionBusy} onChange={e=>setCorrection(v=>v&&({...v,status:e.target.value}))}>{correctionStages.slice(0,Math.max(0,correctionStages.indexOf(correction?.original_status))).map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField><TextField required multiline label={l('Tuzatish sababi','Причина исправления','Correction reason')} value={correction?.reason||''} disabled={correctionBusy} onChange={e=>setCorrection(v=>v&&({...v,reason:e.target.value}))} helperText={`${correction?.reason?.length||0}/500`}/></Stack></DialogContent><DialogActions><Button disabled={correctionBusy} onClick={()=>setCorrection(null)}>{l('Yopish','Закрыть','Close')}</Button><Button variant="contained" disabled={correctionBusy||!correction?.status||!correction?.reason?.trim()||correction.reason.length>500} onClick={()=>void correct()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
    {confirmDialog}
    <Dialog open={detailId!==null} onClose={closeDetail} fullWidth maxWidth="md"><DialogTitle>{l('Buyurtma','Заказ','Order')} №{detailId}</DialogTitle><DialogContent>{detailLoading&&<CircularProgress size={24}/>} {detailError&&<Alert severity="error">{detailError}</Alert>} {detail&&<><Stack sx={{ gap: 1, mb: 2 }}><Typography>{detail?.order?.customer_name} · {detail?.order?.phone_number}</Typography><Typography variant="subtitle2">{l('Yetkazib berish manzili','Адрес доставки','Delivery address')}</Typography><Typography sx={{color:"text.secondary"}}>{detail?.order?.customer_address||l('Manzil ko‘rsatilmagan','Адрес не указан','Address not provided')}</Typography></Stack>{detail.order.cancel_reason&&<Alert severity="info" sx={{mb:2}}>{l('Bekor qilish sababi','Причина отмены','Cancellation reason')}: {detail.order.cancel_reason}</Alert>}<PartialReturnNotice value={detail.partial_return}/><ReturnEvidence photo={detail.return_photo}/><Typography variant="h6" sx={{mt:3,mb:1}}>{l('Holat tarixi','История статусов','Status history')}</Typography><Alert severity="info" sx={{mb:1}}>{l('Tarix yozuvi yoqilganidan oldingi o‘zgarishlar mavjud emas. Eng so‘nggi 500 yozuv ko‘rsatiladi.','Изменения до включения истории недоступны. Показаны последние 500 записей.','Changes before history was enabled are unavailable. The latest 500 records are shown.')}</Alert><TableContainer sx={{mb:3}}><Table size="small"><TableHead><TableRow><TableCell>{l('Vaqt','Время','Time')}</TableCell><TableCell>{l('Kim / manba','Кто / источник','Actor / source')}</TableCell><TableCell>{l('Holat o‘zgarishi','Изменение статуса','Status change')}</TableCell><TableCell>{l('Sabab','Причина','Reason')}</TableCell></TableRow></TableHead><TableBody>{(detail.status_history||[]).map((h:Row)=><TableRow key={h.id}><TableCell>{dateTime(h.changed_at)}</TableCell><TableCell>{h.actor}<Typography variant="caption" sx={{display:'block'}}>{historySource(h.source)}</Typography></TableCell><TableCell>{h.source==='BASELINE'?l('Boshlang‘ich holat','Начальное состояние','Baseline'):h.source==='CREATED'?l('Buyurtma yaratildi','Заказ создан','Order created'):enumLabel(h.from_status)} → {enumLabel(h.to_status)}</TableCell><TableCell>{historyReason(h)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>{(detail.step_history||[]).length>0&&<><Typography variant="subtitle2" sx={{mt:2,mb:1}}>{l('Ombor va kuryer qadamlari','Шаги склада и курьера','Warehouse and courier steps')}</Typography><TableContainer><Table size="small"><TableHead><TableRow><TableCell>{l('Vaqt','Время','Time')}</TableCell><TableCell>{l('Bo‘lim','Участок','Area')}</TableCell><TableCell>{l('Kim','Кто','Who')}</TableCell><TableCell>{l('Qadam','Шаг','Step')}</TableCell><TableCell>{l('Izoh','Примечание','Note')}</TableCell></TableRow></TableHead><TableBody>{(detail.step_history as Row[]).map(h=><TableRow key={h.id}><TableCell>{dateTime(h.changed_at)}</TableCell><TableCell>{h.step==='WAREHOUSE'?l('Ombor','Склад','Warehouse'):l('Yetkazish','Доставка','Delivery')}</TableCell><TableCell>{h.actor}</TableCell><TableCell>{enumLabel(h.status)}</TableCell><TableCell>{h.reason||'—'}</TableCell></TableRow>)}</TableBody></Table></TableContainer></>}<OrderPayments key={detail.order.id} orderId={detail.order.id} payments={detail.payments} order={detail.order} monitorEnabled={detail.refund_monitor_enabled===true}/><Table size="small"><TableHead><TableRow><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Soni','Кол-во','Qty')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell>{l('Jami','Всего','Total')}</TableCell></TableRow></TableHead><TableBody>{detail?.items?.map((i:Row)=><TableRow key={i.id}><TableCell>{i.product_name}</TableCell><TableCell>{i.quantity}</TableCell><TableCell>{money(i.unit_price)}</TableCell><TableCell>{money(i.total_price)}</TableCell></TableRow>)}</TableBody></Table></>}</DialogContent><DialogActions>{admin?.role==='SUPER_ADMIN'&&detail?.order?.payment_status==='PAID'&&correctionStages.indexOf(detail?.order?.status)>0&&<Button onClick={()=>{setCorrectionError(null);setCorrection({id:detail.order.id,original_status:detail.order.status,status:'',reason:''});}}>{l('Holatni tuzatish','Исправить статус','Correct status')}</Button>}<Button disabled={detailLoading} startIcon={<RefreshRounded/>} onClick={()=>{if(detailId!==null){void openDetail(detailId);void x.reload();}}}>{l('Yangilash','Обновить','Refresh')}</Button><Button onClick={closeDetail}>{l('Yopish','Закрыть','Close')}</Button></DialogActions></Dialog>
  </>;
}

export function ProductsPage() {
  const [priceHistoryId,setPriceHistoryId]=useState<number|null>(null);
  const token = useToken();
  const [warehouseEnabled, setWarehouseEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    warehouseStatus(token).then(status => { if (alive) setWarehouseEnabled(status.enabled); })
      .catch(() => { if (alive) setWarehouseEnabled(null); });
    return () => { alive = false; };
  }, [token]);
  const l = useL();
  const enumLabel = useEnumLabel();
  const { confirm, confirmDialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const [categories, setCategories] = useState<Row[]>([]);
  const [mxikOptions, setMxikOptions] = useState<Row[]>([]);
  const [mxikKeyword, setMxikKeyword] = useState('');
  const [mxikLoading, setMxikLoading] = useState(false);
  const [mxikLoadingMore, setMxikLoadingMore] = useState(false);
  const [mxikOffset, setMxikOffset] = useState(0);
  const [mxikHasMore, setMxikHasMore] = useState(true);
  const mxikRequestVersion = useRef(0);
  const mxikLoadingMoreRef = useRef(false);
  const [createMxik, setCreateMxik] = useState<Row | null>(null);
  const [createPackages, setCreatePackages] = useState<Row[]>([]);
  const [createPackagesLoading, setCreatePackagesLoading] = useState(false);
  const [editMxik, setEditMxik] = useState<Row | null>(null);
  const [editPackages, setEditPackages] = useState<Row[]>([]);
  const [editPackagesLoading, setEditPackagesLoading] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [editOriginal, setEditOriginal] = useState<Row | null>(null);
  const [editDeletedImageIds, setEditDeletedImageIds] = useState<number[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [productActionId, setProductActionId] = useState<number | null>(null);

  const loader = useCallback(
    (page: number, pageSize: number) => api.listProducts(token, {
      page,
      page_size: pageSize,
      search,
      category_id: categoryId ? Number(categoryId) : undefined,
      active: active === '' ? undefined : active === 'true',
    }),
    [token, search, categoryId, active],
  );
  const x = usePaged(loader);
  const exportProducts = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true; setExporting(true); setActionError(null);
    try {
      const rows = await collectProducts(loader);
      const book = await createProductWorkbook(rows,l);
      const buffer = await book.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const link = document.createElement('a'); link.href=url; link.download='products.xlsx'; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch {
      setActionError(l('Eksport bajarilmadi. Ma’lumotlar o‘zgargan bo‘lishi mumkin. Qayta urinib ko‘ring yoki filtr orqali 50 000 tagacha kamaytiring.','Экспорт не выполнен. Данные могли измениться. Повторите или сократите выборку фильтрами до 50 000 товаров.','Export failed. Data may have changed. Retry or narrow the filters to at most 50,000 products.'));
    } finally { exportingRef.current=false; setExporting(false); }
  };


  useEffect(() => {
    void api.listCategories(token).then(setCategories);
  }, [token]);

  const fiscalDialogOpen = createOpen || Boolean(edit);

  const loadMxikPage = useCallback(async (offset: number, append: boolean, version: number) => {
    if (append) {
      if (mxikLoadingMoreRef.current) return;
      mxikLoadingMoreRef.current = true;
      setMxikLoadingMore(true);
    } else {
      setMxikLoading(true);
    }
    try {
      const rows = await api.listFiscalMxik(token, mxikKeyword, MXIK_PAGE_SIZE, offset);
      if (version !== mxikRequestVersion.current) return;
      setMxikOptions((current) => {
        const base = append ? current : [];
        const byId = new Map<number, Row>();
        base.forEach((item) => byId.set(Number(item.mxik_id), item));
        rows.forEach((item) => byId.set(Number(item.mxik_id), item));
        return Array.from(byId.values());
      });
      setMxikOffset(offset + rows.length);
      setMxikHasMore(rows.length === MXIK_PAGE_SIZE);
    } catch (error) {
      if (version === mxikRequestVersion.current) {
        setActionError(error instanceof Error ? error.message : 'Error');
      }
    } finally {
      if (append) {
        mxikLoadingMoreRef.current = false;
        if (version === mxikRequestVersion.current) setMxikLoadingMore(false);
      } else if (version === mxikRequestVersion.current) {
        setMxikLoading(false);
      }
    }
  }, [token, mxikKeyword]);

  useEffect(() => {
    if (!fiscalDialogOpen) return;
    const timer = window.setTimeout(() => {
      const version = ++mxikRequestVersion.current;
      mxikLoadingMoreRef.current = false;
      setMxikOptions([]);
      setMxikOffset(0);
      setMxikHasMore(true);
      setMxikLoadingMore(false);
      void loadMxikPage(0, false, version);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fiscalDialogOpen, mxikKeyword, loadMxikPage]);

  const handleMxikScroll = (event: UIEvent<HTMLElement>) => {
    const listbox = event.currentTarget;
    const nearBottom = listbox.scrollTop + listbox.clientHeight >= listbox.scrollHeight - 48;
    if (nearBottom && mxikHasMore && !mxikLoading && !mxikLoadingMoreRef.current) {
      void loadMxikPage(mxikOffset, true, mxikRequestVersion.current);
    }
  };

  const mxikDisplayOptions: Row[] = mxikLoadingMore
    ? [...mxikOptions, { __mxikLoading: true }]
    : mxikOptions;

  const loadCreatePackages = async (mxik: Row | null) => {
    setCreateMxik(mxik);
    setCreatePackages([]);
    setForm((value) => ({
      ...value,
      fiscal_mxik_package_id: '',
      short_description: '',
      description: mxik?.mxik_name ?? '',
    }));
    if (!mxik?.mxik_id) return;
    setCreatePackagesLoading(true);
    try {
      setCreatePackages(await api.listFiscalPackages(token, '', Number(mxik.mxik_id)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    } finally {
      setCreatePackagesLoading(false);
    }
  };

  const loadEditPackages = async (mxik: Row | null) => {
    setEditMxik(mxik);
    setEditPackages([]);
    setEdit((value) => value && ({
      ...value,
      fiscal_mxik_package_id: '',
      short_description: '',
      description: mxik?.mxik_name ?? '',
      mxik_id: mxik?.mxik_id ?? null,
      mxik_name: mxik?.mxik_name ?? '',
      mxik_code: mxik?.mxik_code ?? '',
    }));
    if (!mxik?.mxik_id) return;
    setEditPackagesLoading(true);
    try {
      setEditPackages(await api.listFiscalPackages(token, '', Number(mxik.mxik_id)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    } finally {
      setEditPackagesLoading(false);
    }
  };

  const selectCreatePackage = (packageId: string | number) => {
    const selected = createPackages.find((item) => Number(item.fiscal_mxik_package_id) === Number(packageId));
    setForm((value) => ({
      ...value,
      fiscal_mxik_package_id: packageId,

    }));
  };

  const selectEditPackage = (packageId: string | number) => {
    const selected = editPackages.find((item) => Number(item.fiscal_mxik_package_id) === Number(packageId));
    setEdit((value) => value && ({
      ...value,
      fiscal_mxik_package_id: Number(packageId),

      package_code: selected?.package_code ?? '',
      package_name: selected?.package_name ?? '',
    }));
  };

  const blankProduct = (): Row => ({
    category_id: '', fiscal_mxik_package_id: '', vat_percent: 12, name: '', short_description: '', description: '',
    sku: '', barcode: '', brand: '', price: '', subscription_price: '', stock_quantity: 0, weight_gram: '',
  });
  const [form, setForm] = useState<Row>(blankProduct);

  const openEdit = async (id: number) => {
    setActionError(null);
    try {
      const detail = await api.getProduct(token, id);
      const product = { ...detail.product, images: detail.images ?? [] };
      setEdit(product);
      setEditOriginal({ ...product, images: [...(product.images ?? [])] });
      setEditImages([]);
      setEditDeletedImageIds([]);
      setEditError(null);
      setEditSaving(false);
      setMxikKeyword('');

      if (product.mxik_id) {
        const currentMxik = { mxik_id: product.mxik_id, mxik_code: product.mxik_code, mxik_name: product.mxik_name };
        setEditMxik(currentMxik);
        setMxikOptions((current) => [currentMxik, ...current.filter((item) => Number(item.mxik_id) !== Number(currentMxik.mxik_id))]);
        setEditPackagesLoading(true);
        try {
          setEditPackages(await api.listFiscalPackages(token, '', Number(product.mxik_id)));
        } finally {
          setEditPackagesLoading(false);
        }
      } else {
        setEditMxik(null);
        setEditPackages([]);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEdit(null);
    setEditOriginal(null);
    setEditImages([]);
    setEditDeletedImageIds([]);
    setEditError(null);
  };

  const sameEditValue = (key: string, a: unknown, b: unknown) => {
    const numericKeys = new Set(['category_id', 'fiscal_mxik_package_id', 'vat_percent', 'price', 'subscription_price', 'stock_quantity', 'weight_gram']);
    const nullableNumericKeys = new Set(['subscription_price', 'weight_gram']);
    const nullableTextKeys = new Set(['sku', 'barcode', 'brand']);

    if (['cost_price','min_stock_quantity','shelf_life_days'].includes(key)) return (a==null||a==='')?(b==null||b===''):!(b==null||b==='')&&Number(a)===Number(b);
    if (numericKeys.has(key)) {
      if (nullableNumericKeys.has(key) && (a === '' || a == null) && (b === '' || b == null)) return true;
      return Number(a ?? 0) === Number(b ?? 0);
    }
    if (nullableTextKeys.has(key)) return String(a ?? '').trim() === String(b ?? '').trim();
    if (key === 'is_active') return Boolean(a) === Boolean(b);
    return String(a ?? '') === String(b ?? '');
  };

  const saveEdit = async () => {
    if (!edit || !editOriginal || editSaving) return;
    setEditError(null);
    setEditSaving(true);

    try {
      const currentValues: Row = {
        category_id: Number(edit.category_id),
        fiscal_mxik_package_id: Number(edit.fiscal_mxik_package_id),
        vat_percent: Number(edit.vat_percent ?? 0),
        name: String(edit.name ?? '').trim(),
        short_description: edit.short_description ?? '',
        description: edit.description ?? '',
        sku: String(edit.sku ?? '').trim() || null,
        barcode: String(edit.barcode ?? '').trim() || null,
        brand: String(edit.brand ?? '').trim() || null,
        price: Number(edit.price ?? 0),
        subscription_price: edit.subscription_price === '' || edit.subscription_price == null ? null : Number(edit.subscription_price),
        stock_quantity: Number(edit.stock_quantity ?? 0),
        weight_gram: edit.weight_gram === '' || edit.weight_gram == null ? null : Number(edit.weight_gram),
        is_active: Boolean(edit.is_active),
        ...metadataValues(edit),
      };

      const changedFields: Row = {};
      Object.entries(currentValues).forEach(([key, value]) => {
        if (key === "stock_quantity" && warehouseEnabled !== false) return;
        if (!sameEditValue(key, value, editOriginal[key])) changedFields[key] = value;
      });

      if (Object.keys(changedFields).length > 0) {
        await api.updateProduct(token, edit.id, {...changedFields,price_change_reason:edit.price_change_reason||''});
      }

      for (const imageId of editDeletedImageIds) {
        await api.deleteProductImage(token, edit.id, imageId);
      }

      if (editImages.length > 0) {
        await api.addProductImages(token, edit.id, editImages);
      }

      setEdit(null);
      setEditOriginal(null);
      setEditImages([]);
      setEditDeletedImageIds([]);
      setEditError(null);
      await x.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error';
      setEditError(message === 'NETWORK_ERROR'
        ? l(
            'Server bilan ulanishda xatolik yuz berdi. O‘zgarishlar to‘liq saqlanmagan bo‘lishi mumkin. Qayta urinib ko‘ring.',
            'Ошибка соединения с сервером. Некоторые изменения могли не сохраниться. Попробуйте ещё раз.',
            'Could not connect to the server. Some changes may not have been saved. Please try again.',
          )
        : message);
    } finally {
      setEditSaving(false);
    }
  };

  const createProduct = async () => {
    if (createSaving) return;
    setCreateError(null);

    const missingRequired = !form.category_id || !form.fiscal_mxik_package_id || !String(form.name ?? '').trim() || form.price === '' || form.price == null;
    if (missingRequired) {
      setCreateError(l(
        'Majburiy maydonlarni to‘ldiring: kategoriya, Fiscal MXIK/qadoq, mahsulot nomi va narx.',
        'Заполните обязательные поля: категория, Fiscal MXIK/упаковка, название товара и цена.',
        'Please fill the required fields: category, Fiscal MXIK/package, product name and price.',
      ));
      return;
    }

    setCreateSaving(true);
    try {
      await api.createProduct(token, {
        ...form,
        ...metadataValues(form),
        category_id: Number(form.category_id),
        fiscal_mxik_package_id: Number(form.fiscal_mxik_package_id),
        vat_percent: Number(form.vat_percent),
        name: String(form.name).trim(),
        sku: String(form.sku ?? '').trim() || null,
        barcode: String(form.barcode ?? '').trim() || null,
        brand: String(form.brand ?? '').trim() || null,
        price: Number(form.price),
        subscription_price: form.subscription_price === '' ? null : Number(form.subscription_price),
        stock_quantity: warehouseEnabled === false ? Number(form.stock_quantity) : 0,
        weight_gram: form.weight_gram === '' ? null : Number(form.weight_gram),
      }, images);
      setCreateOpen(false);
      setForm(blankProduct());
      setImages([]);
      setCreateMxik(null);
      setCreatePackages([]);
      setMxikKeyword('');
      setCreateError(null);
      void x.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'NETWORK_ERROR' || message === 'Failed to fetch') {
        setCreateError(l(
          'Server bilan ulanishda xatolik yuz berdi. Internet/server holatini va rasm hajmini tekshirib, qayta urinib ko‘ring.',
          'Ошибка соединения с сервером. Проверьте соединение/сервер и размер изображения, затем попробуйте снова.',
          'Could not connect to the server. Check the connection/server and image size, then try again.',
        ));
      } else if (message.startsWith('PRODUCT_CREATED_IMAGE_UPLOAD_FAILED:')) {
        const parts = message.split(':');
        const reason = parts.slice(2).join(':').trim();
        const baseMessage = l(
          'Mahsulot yaratildi, lekin rasmni yuklashda xatolik yuz berdi.',
          'Товар создан, но при загрузке изображения произошла ошибка.',
          'The product was created, but an image upload failed.',
        );
        setCreateError(reason ? `${baseMessage} ${reason}` : baseMessage);
      } else if (['IMAGE_READ_FAILED','IMAGE_PROCESSING_FAILED','ONLY_IMAGE_FILES_ALLOWED'].includes(message)) {
        setCreateError(l(
          'Rasmni tayyorlashda xatolik yuz berdi. Boshqa PNG/JPG rasm tanlab qayta urinib ko‘ring.',
          'Не удалось подготовить изображение. Выберите другой PNG/JPG файл и попробуйте снова.',
          'The image could not be prepared. Choose another PNG/JPG image and try again.',
        ));
      } else if (message.toLowerCase().includes('too large') || message.includes('20 MB')) {
        setCreateError(l(
          'Rasm server limitidan katta bo‘lib qoldi. Boshqa rasm bilan qayta urinib ko‘ring.',
          'После обработки изображение всё ещё превышает лимит сервера. Попробуйте другое изображение.',
          'The processed image is still above the server limit. Please try another image.',
        ));
      } else {
        setCreateError(message || l('Mahsulotni saqlashda xatolik yuz berdi.', 'Произошла ошибка при сохранении товара.', 'An error occurred while saving the product.'));
      }
    } finally {
      setCreateSaving(false);
    }
  };

  const stageEditImageRemoval = (imageId: number) => {
    if (!edit || editSaving) return;
    setEdit((current) => current && ({
      ...current,
      images: (current.images ?? []).filter((image: Row) => Number(image.id) !== imageId),
    }));
    setEditDeletedImageIds((current) => current.includes(imageId) ? current : [...current, imageId]);
  };

  const toggleProductActive = async (row: Row) => {
    const productId = Number(row.id);
    const nextActive = !Boolean(row.is_active);
    setActionError(null);
    setProductActionId(productId);
    try {
      await api.updateProductInline(token, productId, { is_active: nextActive });
      const filteredOut = (active === 'true' && !nextActive) || (active === 'false' && nextActive);
      if (filteredOut) x.removeItem(productId);
      else x.updateItem(productId, (current) => ({ ...current, is_active: nextActive }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : l('Holatni yangilab bo‘lmadi.', 'Не удалось обновить статус.', 'Could not update status.'));
    } finally {
      setProductActionId(null);
    }
  };

  const removeProduct = async (row: Row) => {
    const ok = await confirm({
      danger: true,
      message: warehouseEnabled === true ? l(
        `“${String(row.name || '')}” mahsulotini nofaol qilasizmi? Ombor tarixi saqlanadi.`,
        `Деактивировать товар «${String(row.name || '')}»? История склада сохранится.`,
        `Deactivate “${String(row.name || '')}”? Warehouse history will be retained.`,
      ) : l(
        `“${String(row.name || '')}” mahsulotini butunlay o‘chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo‘lmaydi.`,
        `Вы уверены, что хотите навсегда удалить товар «${String(row.name || '')}»? Это действие нельзя отменить.`,
        `Are you sure you want to permanently delete “${String(row.name || '')}”? This action cannot be undone.`,
      ),
    });
    if (!ok) return;
    setActionError(null);
    setProductActionId(Number(row.id));
    try {
      await api.deleteProduct(token, Number(row.id));
      await x.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'PRODUCT_IS_IN_USE') {
        setActionError(l(
          'Bu mahsulot buyurtma, banner, savat, sharh yoki boshqa ma’lumotlarda ishlatilgan. Uni o‘chirish o‘rniga Nofaol holatga o‘tkazing.',
          'Этот товар уже используется в заказах, баннере, корзине, отзывах или других данных. Вместо удаления переведите его в неактивное состояние.',
          'This product is already used by orders, banners, carts, reviews, or other data. Make it inactive instead of deleting it.',
        ));
      } else {
        setActionError(message || l('Mahsulotni o‘chirib bo‘lmadi.', 'Не удалось удалить товар.', 'Could not delete the product.'));
      }
    } finally {
      setProductActionId(null);
    }
  };

  const formField = (key: string, label: string, type = 'text') => (
    <TextField disabled={key === "stock_quantity" && warehouseEnabled !== false} helperText={key === "stock_quantity" && warehouseEnabled === true ? l("Qoldiq kirim hujjati orqali o‘zgaradi.", "Остаток меняется документами прихода.", "Stock changes through receipt documents.") : undefined} label={label} type={type} value={form[key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))} />
  );
  const editField = (key: string, label: string, type = 'text') => (
    <TextField disabled={key === "stock_quantity" && warehouseEnabled !== false} helperText={key === "stock_quantity" && warehouseEnabled === true ? l("Qoldiq kirim hujjati orqali o‘zgaradi.", "Остаток меняется документами прихода.", "Stock changes through receipt documents.") : undefined} label={label} type={type} value={edit?.[key] ?? ''} onChange={(event) => setEdit((value) => value && ({ ...value, [key]: event.target.value }))} />
  );

  return <>
    <PageTitle
      title={l('Mahsulotlar', 'Товары', 'Products')}
      subtitle={l('Narx, ombor, tavsif va mavjudlikni boshqaring.', 'Управляйте ценами, остатками, описанием и доступностью.', 'Manage pricing, stock, descriptions and availability.')}
      actionLabel={l('Mahsulot qo‘shish', 'Добавить товар', 'Add product')}
      onAction={() => { setForm(blankProduct()); setImages([]); setCreateMxik(null); setCreatePackages([]); setMxikKeyword(''); setCreateError(null); setCreateSaving(false); setCreateOpen(true); }}
    />
    {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{mb:3}}>
      <TextField size="small" label={l('Qidirish', 'Поиск', 'Search')} value={search} onChange={(event) => setSearch(event.target.value)} />
      <TextField select size="small" label={l('Kategoriya', 'Категория', 'Category')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} sx={{ minWidth: 200 }}>
        <MenuItem value="">{l('Barchasi', 'Все', 'All')}</MenuItem>
        {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
      </TextField>
      <TextField select size="small" label={l('Mavjudlik', 'Активность', 'Active')} value={active} onChange={(event) => setActive(event.target.value)} sx={{ minWidth: 170 }}>
        <MenuItem value="">{l('Barchasi', 'Все', 'All')}</MenuItem><MenuItem value="true">{enumLabel('ACTIVE')}</MenuItem><MenuItem value="false">{enumLabel('INACTIVE')}</MenuItem>
      </TextField>
    </Stack>

    <Button disabled={exporting || x.loading} onClick={()=>void exportProducts()} sx={{mb:2}}>{exporting ? l('Yuklanmoqda…','Загрузка…','Exporting…') : l('Excel — barcha natijalar','Excel — все результаты','Excel — all results')}</Button>
    <LoadState loading={x.loading} error={x.error} onRetry={x.reload}>
      <TablePanel><Table><TableHead><TableRow>
        <TableCell>{l('Mahsulot', 'Товар', 'Product')}</TableCell><TableCell>SKU</TableCell><TableCell>{l('Shtrix-kod','Штрихкод','Barcode')}</TableCell><TableCell>{l('Kategoriya', 'Категория', 'Category')}</TableCell><TableCell>{l('Narx', 'Цена', 'Price')}</TableCell><TableCell>{l('Obuna narxi', 'Цена подписки', 'Subscription')}</TableCell><TableCell>{l('Ombor', 'Остаток', 'Stock')}</TableCell><TableCell>{l('Holat', 'Статус', 'Status')}</TableCell><TableCell />
      </TableRow></TableHead><TableBody>
        {x.data.items.map((row) => <TableRow key={row.id} hover>
          <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><Avatar variant="rounded" src={api.imageUrl(row.image_url)} sx={{ mr: '28px', flexShrink: 0 }}>{String(row.name || '?')[0]}</Avatar><Box><Typography sx={{fontWeight:700}}>{row.name}</Typography><Typography variant="caption" sx={{color:"text.secondary"}}>{row.brand || row.sku || ''}</Typography></Box></Box></TableCell>
          <TableCell>{row.sku || '—'}</TableCell><TableCell>{row.barcode || '—'}</TableCell>
          <TableCell>{row.category_name || '-'}</TableCell><TableCell>{money(row.price)}</TableCell><TableCell>{row.subscription_price == null ? '-' : money(row.subscription_price)}</TableCell><TableCell>{row.stock_quantity}{row.min_stock_quantity!=null&&Number(row.stock_quantity)<Number(row.min_stock_quantity)&&<Typography color="warning.main" variant="caption" sx={{display:'block'}}>{l('Minimaldan past','Ниже минимума','Below minimum')}</Typography>}</TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} sx={{alignItems:"center"}}>
              <Switch size="small" checked={Boolean(row.is_active)} disabled={productActionId === Number(row.id)} onChange={() => void toggleProductActive(row)} />
              {productActionId === Number(row.id)
                ? <CircularProgress size={18} thickness={5} />
                : <Typography variant="body2" sx={{fontWeight:700}}>{enumLabel(row.is_active ? 'ACTIVE' : 'INACTIVE')}</Typography>}
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={l('Tahrirlash','Редактировать','Edit')}><span><IconButton disabled={productActionId === Number(row.id)} onClick={() => void openEdit(row.id)}><EditRounded /></IconButton></span></Tooltip>
              <Tooltip title={l('O‘chirish','Удалить','Delete')}><span><IconButton color="error" disabled={productActionId === Number(row.id)} onClick={() => void removeProduct(row)}><DeleteRounded /></IconButton></span></Tooltip>
            </Stack>
          </TableCell>
        </TableRow>)}
      </TableBody></Table>{x.pagination}</TablePanel>
    </LoadState>

    {priceHistoryId!==null&&<ProductPriceHistory token={token} id={priceHistoryId} onClose={()=>setPriceHistoryId(null)}/>}
    <Dialog open={Boolean(edit)} onClose={closeEdit} fullWidth maxWidth="md">
      <DialogTitle>{l('Mahsulotni tahrirlash', 'Редактировать товар', 'Edit product')}</DialogTitle>
      <DialogContent sx={{ pt: '20px!important' }}>
        {editError && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setEditError(null)}>{editError}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, columnGap: 3, rowGap: 3, '& .MuiFormControl-root': { minWidth: 0 } }}>
        <TextField select label={l('Kategoriya', 'Категория', 'Category')} value={edit?.category_id ?? ''} onChange={(event) => setEdit((value) => value && ({ ...value, category_id: Number(event.target.value) }))}>{categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField>
        <Autocomplete
          options={mxikDisplayOptions}
          value={editMxik}
          loading={mxikLoading}
          filterOptions={(options) => options}
          getOptionLabel={(option) => option?.__mxikLoading ? '' : String(option?.mxik_name ?? '')}
          isOptionEqualToValue={(option, value) => !option?.__mxikLoading && Number(option.mxik_id) === Number(value.mxik_id)}
          onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setMxikKeyword(value); }}
          onChange={(_, value) => { if (!value?.__mxikLoading) void loadEditPackages(value); }}
          noOptionsText={l('MXIK topilmadi', 'MXIK не найден', 'No MXIK found')}
          loadingText={l('Qidirilmoqda...', 'Поиск...', 'Searching...')}
          slotProps={{ listbox: { onScroll: handleMxikScroll } }}
          renderOption={(props, option) => option?.__mxikLoading
            ? <li {...props} key="mxik-loading" aria-disabled="true" style={{ justifyContent: 'center', pointerEvents: 'none' }}><CircularProgress size={22} /></li>
            : <li {...props} key={option.mxik_id}>{option.mxik_name}</li>}
          renderInput={(params) => <TextField {...params} label="Fiscal MXIK" />}
        />
        <TextField select label={l('Qadoq / o‘lchov', 'Упаковка / единица', 'Package / unit')} value={edit?.fiscal_mxik_package_id ?? ''} disabled={!editMxik || editPackagesLoading} onChange={(event) => selectEditPackage(event.target.value)}>
          {editPackages.map((item) => <MenuItem key={item.fiscal_mxik_package_id} value={item.fiscal_mxik_package_id}>{item.package_name}</MenuItem>)}
        </TextField>
        {editField('name', l('Nomi', 'Название', 'Name'))}{editField('brand', l('Brend', 'Бренд', 'Brand'))}
        {editField('price', l('Narx', 'Цена', 'Price'), 'number')}{editField('subscription_price', l('Obuna narxi', 'Цена подписки', 'Subscription price'), 'number')}
        <ProductMetadataFields value={edit??{}} onChange={(key,value)=>setEdit(v=>v&&({...v,[key]:value}))}/>
        <TextField multiline label={l('Narx o‘zgarishi sababi','Причина изменения цены','Reason for price change')} helperText={l('Xodim narxni o‘zgartirganda majburiy.','Обязательно при изменении цены сотрудником.','Required when staff change a price.')} value={edit?.price_change_reason||''} onChange={e=>setEdit(v=>v&&({...v,price_change_reason:e.target.value}))}/>
        <Button disabled={!edit?.id} onClick={()=>setPriceHistoryId(edit!.id)}>{l('Narxlar tarixi','История цен','Price history')}</Button>
        {editField('stock_quantity', l('Ombor', 'Остаток', 'Stock'), 'number')}{editField('vat_percent', 'VAT %', 'number')}
        {editField('sku', 'SKU')}{editField('barcode', l('Shtrix kod', 'Штрихкод', 'Barcode'))}{editField('weight_gram', l('Og‘irlik (g)', 'Вес (г)', 'Weight (g)'), 'number')}
        <Box sx={{ gridColumn: '1 / -1' }}><FormControlLabel control={<Checkbox checked={Boolean(edit?.is_active)} onChange={(event) => setEdit((value) => value && ({ ...value, is_active: event.target.checked }))} />} label={l('Faol', 'Активный', 'Active')} /></Box>
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Qisqa tavsif', 'Краткое описание', 'Short description')} value={edit?.short_description ?? ''} multiline minRows={2} onChange={e=>setEdit(v=>v&&({...v,short_description:e.target.value}))} />
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Tavsif', 'Описание', 'Description')} value={edit?.description ?? ''} multiline minRows={2} onChange={e=>setEdit(v=>v&&({...v,description:e.target.value}))} />
        <Box sx={{ gridColumn: { md: '1 / -1' }, mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 2.25 }}>{l('Mahsulot rasmlari', 'Изображения товара', 'Product images')}</Typography>

          {Array.isArray(edit?.images) && edit.images.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 2, mb: 2.5 }}>
              {edit.images.map((image: Row) => (
                <Box key={image.id} sx={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
                  <Avatar variant="rounded" src={api.imageUrl(image.image_url)} sx={{ width: 104, height: 104, bgcolor: 'grey.100' }} />
                  <Tooltip title={l('Saqlaganda rasm o‘chiriladi', 'Изображение будет удалено при сохранении', 'Image will be deleted when saved')}>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={editSaving}
                      onClick={() => stageEditImageRemoval(Number(image.id))}
                      sx={{
                        position: 'absolute', right: 4, top: 4, width: 28, height: 28,
                        bgcolor: 'rgba(255,255,255,.96)', border: '1px solid', borderColor: 'divider', boxShadow: 1,
                        '&:hover': { bgcolor: 'background.paper' },
                      }}
                    >
                      <DeleteRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}

          <Button component="label" variant="outlined" disabled={editSaving} sx={{ mb: editImages.length > 0 ? 2.5 : 0 }}>
            {l('Rasm qo‘shish', 'Добавить изображения', 'Add images')}
            <input
              hidden
              multiple
              type="file"
              accept="image/*"
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                setEditImages((current) => {
                  const existing = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
                  return [...current, ...selected.filter((file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`))];
                });
                event.currentTarget.value = '';
              }}
            />
          </Button>

          {editImages.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 2 }}>
              {editImages.map((file, index) => (
                <SelectedImageThumbnail
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  removeLabel={l('Tanlangan rasmni olib tashlash', 'Удалить выбранное изображение', 'Remove selected image')}
                  onRemove={() => setEditImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box></DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={editSaving} onClick={closeEdit}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
        <Button variant="contained" disabled={editSaving} onClick={() => void saveEdit()}>{l('Saqlash', 'Сохранить', 'Save')}</Button>
      </DialogActions>
      <Backdrop
        open={editSaving}
        sx={{ position: 'fixed', zIndex: 1600, bgcolor: 'rgba(255,255,255,0.82)', color: 'text.primary' }}
      >
        <Stack spacing={2} sx={{alignItems:"center"}}>
          <CircularProgress size={52} />
          <Typography sx={{fontWeight:800}}>{l('Saqlanmoqda...', 'Сохранение...', 'Saving...')}</Typography>
        </Stack>
      </Backdrop>
    </Dialog>

    <Dialog open={createOpen} onClose={() => { if (!createSaving) { setCreateOpen(false); setCreateError(null); } }} fullWidth maxWidth="md">
      <DialogTitle>{l('Yangi mahsulot', 'Новый товар', 'New product')}</DialogTitle>
      <DialogContent sx={{ pt: '20px!important' }}>
        {createError && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setCreateError(null)}>{createError}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, columnGap: 3, rowGap: 3, '& .MuiFormControl-root': { minWidth: 0 } }}>
        <TextField select label={l('Kategoriya', 'Категория', 'Category')} value={form.category_id} onChange={(event) => setForm((value) => ({ ...value, category_id: event.target.value }))}>{categories.filter((category) => category.is_active).map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField>
        <Autocomplete
          options={mxikDisplayOptions}
          value={createMxik}
          loading={mxikLoading}
          filterOptions={(options) => options}
          getOptionLabel={(option) => option?.__mxikLoading ? '' : String(option?.mxik_name ?? '')}
          isOptionEqualToValue={(option, value) => !option?.__mxikLoading && Number(option.mxik_id) === Number(value.mxik_id)}
          onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setMxikKeyword(value); }}
          onChange={(_, value) => { if (!value?.__mxikLoading) void loadCreatePackages(value); }}
          noOptionsText={l('MXIK topilmadi', 'MXIK не найден', 'No MXIK found')}
          loadingText={l('Qidirilmoqda...', 'Поиск...', 'Searching...')}
          slotProps={{ listbox: { onScroll: handleMxikScroll } }}
          renderOption={(props, option) => option?.__mxikLoading
            ? <li {...props} key="mxik-loading" aria-disabled="true" style={{ justifyContent: 'center', pointerEvents: 'none' }}><CircularProgress size={22} /></li>
            : <li {...props} key={option.mxik_id}>{option.mxik_name}</li>}
          renderInput={(params) => <TextField {...params} label="Fiscal MXIK" />}
        />
        <TextField select label={l('Qadoq / o‘lchov', 'Упаковка / единица', 'Package / unit')} value={form.fiscal_mxik_package_id} disabled={!createMxik || createPackagesLoading} onChange={(event) => selectCreatePackage(event.target.value)}>
          {createPackages.map((item) => <MenuItem key={item.fiscal_mxik_package_id} value={item.fiscal_mxik_package_id}>{item.package_name}</MenuItem>)}
        </TextField>
        {formField('name', l('Nomi', 'Название', 'Name'))}{formField('brand', l('Brend', 'Бренд', 'Brand'))}
        {formField('price', l('Narx', 'Цена', 'Price'), 'number')}{formField('subscription_price', l('Obuna narxi', 'Цена подписки', 'Subscription price'), 'number')}
        <ProductMetadataFields value={form} onChange={(key,value)=>setForm(v=>({...v,[key]:value}))}/>
        {formField('stock_quantity', l('Ombor', 'Остаток', 'Stock'), 'number')}{formField('vat_percent', 'VAT %', 'number')}
        {formField('sku', 'SKU')}{formField('barcode', l('Shtrix kod', 'Штрихкод', 'Barcode'))}{formField('weight_gram', l('Og‘irlik (g)', 'Вес (г)', 'Weight (g)'), 'number')}
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Qisqa tavsif', 'Краткое описание', 'Short description')} value={form.short_description} multiline minRows={2} onChange={e=>setForm(v=>({...v,short_description:e.target.value}))} />
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Tavsif', 'Описание', 'Description')} value={form.description} multiline minRows={2} onChange={e=>setForm(v=>({...v,description:e.target.value}))} />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Button component="label" variant="outlined">
            {l('Rasmlarni tanlash', 'Выбрать изображения', 'Choose images')}
            <input hidden multiple type="file" accept="image/*" onChange={(event) => setImages(Array.from(event.target.files || []))} />
          </Button>
          {images.length > 0 && <>
            <Typography variant="body2" sx={{color:"text.secondary", mt: 1.25, mb: 1.25 }}>
              {images.length} {l('ta rasm tanlandi', 'изображений выбрано', 'images selected')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 2 }}>
              {images.map((file, index) => <SelectedImageThumbnail
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                removeLabel={l('Tanlangan rasmni olib tashlash', 'Удалить выбранное изображение', 'Remove selected image')}
                onRemove={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              />)}
            </Box>
          </>}
        </Box>
      </Box></DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={createSaving} onClick={() => { setCreateOpen(false); setCreateError(null); }}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
        <Button variant="contained" disabled={createSaving} onClick={() => void createProduct()}>
          {l('Saqlash', 'Сохранить', 'Save')}
        </Button>
      </DialogActions>
      <Backdrop
        open={createSaving}
        sx={{
          position: 'fixed',
          zIndex: 1600,
          bgcolor: 'rgba(255,255,255,0.82)',
          color: 'text.primary',
        }}
      >
        <Stack spacing={2} sx={{alignItems:"center"}}>
          <CircularProgress size={52} />
          <Typography sx={{fontWeight:800}}>{l('Saqlanmoqda...', 'Сохранение...', 'Saving...')}</Typography>
        </Stack>
      </Backdrop>
    </Dialog>
    {confirmDialog}
  </>;
}

export function CategoriesPage(){
  const token=useToken(),l=useL(); const {confirm,confirmDialog}=useConfirm(); const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[edit,setEdit]=useState<Row|null>(null);
  const load=useCallback(async()=>{setLoading(true);try{setRows(await api.listCategories(token));setError(null);}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setLoading(false)}},[token]); useEffect(()=>{void load()},[load]);
  const [saveError,setSaveError]=useState<string|null>(null);
  const [saving,setSaving]=useState(false),[imageUploading,setImageUploading]=useState(false);
  const savingRef=useRef(false);
  const uploadImage=async(file:File)=>{setImageUploading(true);setSaveError(null);try{const image_url=await api.uploadCategoryImage(token,file);setEdit(v=>v&&({...v,image_url}));}catch{setSaveError(l('Rasm yuklanmadi. Boshqa JPG yoki PNG fayl tanlang.','Изображение не загружено. Выберите другой JPG или PNG.','Image upload failed. Select another JPG or PNG.'));}finally{setImageUploading(false)}};
  const eligibleParents=rows.filter(candidate=>{const seen=new Set<number>();let current:Row|undefined=candidate;while(current){if(Number(current.id)===Number(edit?.id)||seen.has(Number(current.id)))return false;seen.add(Number(current.id));current=rows.find(r=>Number(r.id)===Number(current?.parent_id));}return true;});
  const startNew=()=>setEdit({id:0,name:'',name_uz:'',name_ru:'',parent_id:null,image_url:'',sort_order:0,is_active:true}); const save=async()=>{if(!edit||savingRef.current||imageUploading)return;setSaveError(null);if(!String(edit.name||'').trim()){setSaveError(l('Kategoriya nomini kiriting.','Введите название категории.','Enter a category name.'));return;}savingRef.current=true;setSaving(true);try{if(edit.id&&!edit.is_active){const ok=await confirm({danger:true,message:l('Ushbu kategoriyani faol emas holatda saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить эту категорию неактивной?','Are you sure you want to save this category as inactive?')});if(!ok)return;}if(edit.id)await api.updateCategory(token,edit.id,edit);else await api.createCategory(token,edit);setEdit(null);await load();}catch{setSaveError(l('Kategoriyani saqlab bo‘lmadi. Asosiy kategoriyani tekshiring va qayta urinib ko‘ring.','Не удалось сохранить категорию. Проверьте родительскую категорию и повторите попытку.','Could not save the category. Check names, image URL and parent category, then retry.'));}finally{savingRef.current=false;setSaving(false)}};
  return <><PageTitle title={l('Kategoriyalar','Категории','Categories')} subtitle={l('Kategoriya va tartibni boshqaring.','Управляйте категориями и порядком.','Manage categories and ordering.')} actionLabel={l('Kategoriya qo‘shish','Добавить категорию','Add category')} onAction={()=>{setSaveError(null);startNew()}}/><LoadState loading={loading} error={error} onRetry={load}><TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Nomi','Название','Name')}</TableCell><TableCell>{l('Tartib','Порядок','Order')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.sort_order}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><IconButton onClick={()=>{setSaveError(null);setEdit({...r})}}><EditRounded/></IconButton></TableCell></TableRow>)}</TableBody></Table></TablePanel></LoadState><Dialog open={!!edit} onClose={()=>{if(!saving&&!imageUploading)setEdit(null)}} fullWidth maxWidth="xs"><DialogTitle>{edit?.id?l('Tahrirlash','Редактировать','Edit'):l('Yangi kategoriya','Новая категория','New category')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}>{saveError&&<Alert severity="error">{saveError}</Alert>}<TextField label={l('Nomi','Название','Name')} value={edit?.name||''} onChange={e=>setEdit(v=>v&&({...v,name:e.target.value}))}/><TextField label={l('Nomi (O‘zbekcha)','Название (узбекский)','Name (Uzbek)')} value={edit?.name_uz||''} helperText={l('Bo‘sh bo‘lsa asosiy nom ko‘rsatiladi.','Если пусто, используется основное название.','Uses the default name when empty.')} onChange={e=>setEdit(v=>v&&({...v,name_uz:e.target.value}))}/><TextField label={l('Nomi (Ruscha)','Название (русский)','Name (Russian)')} value={edit?.name_ru||''} onChange={e=>setEdit(v=>v&&({...v,name_ru:e.target.value}))}/><TextField label={l('Rasm URL','URL изображения','Image URL')} value={edit?.image_url||''} onChange={e=>setEdit(v=>v&&({...v,image_url:e.target.value}))}/>{edit?.image_url&&<Box component="img" src={api.imageUrl(edit.image_url)} alt="" sx={{width:100,height:100,objectFit:'contain'}}/>}<Button component="label" disabled={saving||imageUploading}>{imageUploading?l('Yuklanmoqda…','Загрузка…','Uploading…'):l('Rasm tanlash','Выбрать изображение','Choose image')}<input hidden type="file" accept="image/jpeg,image/png" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(file);e.target.value=''}}/></Button><Button disabled={saving||imageUploading||!edit?.image_url} onClick={()=>setEdit(v=>v&&({...v,image_url:''}))}>{l('Rasmni olib tashlash','Убрать изображение','Remove image')}</Button>{!!edit?.id&&<TextField select label={l('Asosiy kategoriya','Родительская категория','Parent category')} value={edit?.parent_id||''} onChange={e=>setEdit(v=>v&&({...v,parent_id:e.target.value?Number(e.target.value):null}))}><MenuItem value="">-</MenuItem>{eligibleParents.map(r=><MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}</TextField>}<TextField type="number" label={l('Tartib','Порядок','Order')} value={edit?.sort_order??0} onChange={e=>setEdit(v=>v&&({...v,sort_order:Number(e.target.value)}))}/><FormControlLabel control={<Checkbox checked={Boolean(edit?.is_active)} onChange={e=>setEdit(v=>v&&({...v,is_active:e.target.checked}))}/>} label={l('Faol','Активна','Active')}/></Stack></DialogContent><DialogActions><Button disabled={saving||imageUploading} onClick={()=>setEdit(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button disabled={saving||imageUploading} variant="contained" onClick={()=>void save()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>{confirmDialog}</>;
}

export function CustomersPage(){
 const token=useToken(),l=useL(),enumLabel=useEnumLabel();const{confirm,confirmDialog}=useConfirm();const[search,setSearch]=useState(''),[active,setActive]=useState('');const loader=useCallback((p:number,s:number)=>api.listCustomers(token,{page:p,page_size:s,search,active:active===''?undefined:active==='true'}),[token,search,active]);const x=usePaged(loader);
 const [customerId,setCustomerId]=useState<number|null>(null),[duplicatesOpen,setDuplicatesOpen]=useState(false);
 const toggle=async(r:Row)=>{const ok=await confirm({danger:Boolean(r.is_active),message:r.is_active?l('Ushbu mijozni bloklashga ishonchingiz komilmi?','Вы уверены, что хотите заблокировать этого клиента?','Are you sure you want to block this customer?'):l('Ushbu mijozni qayta faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите снова активировать этого клиента?','Are you sure you want to reactivate this customer?')});if(!ok)return;await api.setCustomerActive(token,r.id,!r.is_active);await x.reload()};
 return <><PageTitle title={l('Mijozlar','Клиенты','Customers')} subtitle={l('Hisoblar va xarid faoliyatini ko‘ring.','Просматривайте аккаунты и покупки.','Review accounts and purchase activity.')}/><Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mb:3}}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)}/><TextField select size="small" label={l('Holat','Статус','Status')} value={active} onChange={e=>setActive(e.target.value)} sx={{minWidth:160}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem><MenuItem value="true">{enumLabel('ACTIVE')}</MenuItem><MenuItem value="false">{enumLabel('INACTIVE')}</MenuItem></TextField><Button variant="outlined" onClick={()=>setDuplicatesOpen(true)}>{l('Takroriy hisoblar','Дубликаты','Duplicates')}</Button></Stack><ListExcelExport disabled={x.loading} load={loader} fileName="customers.xlsx" build={rows=>createAccountWorkbook('customers',rows,l,enumLabel,{search,active})}/><LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Telefon','Телефон','Phone')}</TableCell><TableCell>Email</TableCell><TableCell>{l('Buyurtmalar','Заказы','Orders')}</TableCell><TableCell>{l('Sarflangan','Потрачено','Spent')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id}><TableCell><Button onClick={()=>setCustomerId(Number(r.id))}>{[r.first_name,r.last_name].filter(Boolean).join(' ')||`№${r.id}`}</Button></TableCell><TableCell>{r.phone_number}</TableCell><TableCell>{r.email||'-'}</TableCell><TableCell>{r.order_count}</TableCell><TableCell>{money(r.total_spent)}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><Button size="small" color={r.is_active?'error':'success'} onClick={()=>void toggle(r)}>{r.is_active?l('Bloklash','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button></TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState>{confirmDialog}{customerId!==null&&<CustomerCard key={customerId} id={customerId} token={token} onClose={()=>setCustomerId(null)}/>}{duplicatesOpen&&<CustomerDuplicates token={token} onClose={()=>setDuplicatesOpen(false)} onMerged={()=>void x.reload()}/>}</>;
}

export function SubscriptionsPage(){
  const token=useToken(), l=useL(), enumLabel=useEnumLabel();
  const { confirm, confirmDialog }=useConfirm();
  const [tab,setTab]=useState(0), [status,setStatus]=useState(''), [search,setSearch]=useState('');
  const loader=useCallback((p:number,s:number)=>api.listSubscriptions(token,{page:p,page_size:s,status,search}),[token,status,search]);
  const x=usePaged(loader);
  const [benefitTariff,setBenefitTariff]=useState<number|null>(null);
  const [tariffs,setTariffs]=useState<Row[]>([]), [editTariff,setEditTariff]=useState<Row|null>(null), [error,setError]=useState<string|null>(null);
  const loadTariffs=useCallback(async()=>{try{setTariffs(await api.listTariffs(token));setError(null);}catch(e){setError(e instanceof Error?e.message:'Error');}},[token]);
  useEffect(()=>{void loadTariffs()},[loadTariffs]);
  const subStatus=async(r:Row,s:string)=>{const ok=await confirm({danger:['CANCELLED','EXPIRED'].includes(s),message:l(`Obuna holatini ${enumLabel(s)} holatiga o‘zgartirishga ishonchingiz komilmi?`,`Вы уверены, что хотите изменить статус подписки на «${enumLabel(s)}»?`,`Are you sure you want to change the subscription status to ${enumLabel(s)}?`)});if(!ok)return;try{await api.setSubscriptionStatus(token,r.id,s);await x.reload();}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const blankTariff=()=>({id:0,name:'',monthly_price:'',duration_months:1,description:'',is_active:true});
  const saveTariff=async()=>{if(!editTariff)return;if(editTariff.id&&!editTariff.is_active){const ok=await confirm({danger:true,message:l('Ushbu tarifni faol emas holatda saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить этот тариф неактивным?','Are you sure you want to save this tariff as inactive?')});if(!ok)return;}try{if(editTariff.id)await api.updateTariff(token,editTariff.id,editTariff);else await api.createTariff(token,editTariff);setEditTariff(null);await loadTariffs();}catch(e){setError(e instanceof Error?e.message:'Error')}};
  return <>
    <PageTitle title={l('Obunalar','Подписки','Subscriptions')} subtitle={l('Mijoz obunalari va tariflarni boshqaring.','Управляйте подписками и тарифами.','Manage subscriptions and tariff plans.')} actionLabel={tab===1?l('Tarif qo‘shish','Добавить тариф','Add tariff'):undefined} onAction={tab===1?()=>setEditTariff(blankTariff()):undefined}/>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Obunalar','Подписки','Subscriptions')}/><Tab label={l('Tariflar','Тарифы','Tariffs')}/></Tabs>
    {tab===0?<>
      <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mb:3}}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)}/><TextField select size="small" label={l('Holat','Статус','Status')} value={status} onChange={e=>setStatus(e.target.value)} sx={{minWidth:170}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['PENDING','ACTIVE','CANCELLED','EXPIRED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField></Stack>
      <ListExcelExport disabled={x.loading} load={loader} fileName="subscriptions.xlsx" build={rows=>createAccountWorkbook('subscriptions',rows,l,enumLabel,{search,status})}/>
      <LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Tarif','Тариф','Tariff')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell>{l('Boshlanish','Начало','Start')}</TableCell><TableCell>{l('Tugash','Конец','End')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id}><TableCell>{r.customer_name||r.phone_number}</TableCell><TableCell>{r.tariff_name}</TableCell><TableCell>{money(r.monthly_price)}</TableCell><TableCell>{dateTime(r.start_date)}</TableCell><TableCell>{dateTime(r.end_date)}</TableCell><TableCell><StatusChip value={r.status}/></TableCell><TableCell><Select size="small" value={r.status} onChange={e=>void subStatus(r,String(e.target.value))}>{['PENDING','ACTIVE','CANCELLED','EXPIRED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</Select></TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState>
    </>:<TablePanel><Table><TableHead><TableRow><TableCell>{l('Tarif','Тариф','Tariff')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell>{l('Muddat','Срок','Duration')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{tariffs.map(r=><TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{money(r.monthly_price)}</TableCell><TableCell>{r.duration_months} {l('oy','мес.','months')}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><Button onClick={()=>setBenefitTariff(r.id)}>{l('Imkoniyatlar','Преимущества','Benefits')}</Button><IconButton onClick={()=>setEditTariff({...r})}><EditRounded/></IconButton></TableCell></TableRow>)}</TableBody></Table></TablePanel>}
    {confirmDialog}
    {benefitTariff!==null&&<TariffBenefits token={token} id={benefitTariff} onClose={()=>setBenefitTariff(null)}/>}
    <Dialog open={!!editTariff} onClose={()=>setEditTariff(null)} fullWidth maxWidth="xs"><DialogTitle>{editTariff?.id?l('Tarifni tahrirlash','Редактировать тариф','Edit tariff'):l('Yangi tarif','Новый тариф','New tariff')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Nomi','Название','Name')} value={editTariff?.name||''} onChange={e=>setEditTariff(v=>v&&({...v,name:e.target.value}))}/><TextField type="number" label={l('Oylik narx','Месячная цена','Monthly price')} value={editTariff?.monthly_price??''} onChange={e=>setEditTariff(v=>v&&({...v,monthly_price:Number(e.target.value)}))}/><TextField type="number" label={l('Oylar','Месяцы','Months')} value={editTariff?.duration_months??1} onChange={e=>setEditTariff(v=>v&&({...v,duration_months:Number(e.target.value)}))}/><TextField multiline label={l('Tavsif','Описание','Description')} value={editTariff?.description||''} onChange={e=>setEditTariff(v=>v&&({...v,description:e.target.value}))}/><FormControlLabel control={<Checkbox checked={Boolean(editTariff?.is_active)} onChange={e=>setEditTariff(v=>v&&({...v,is_active:e.target.checked}))}/>} label={l('Faol','Активен','Active')}/></Stack></DialogContent><DialogActions><Button onClick={()=>setEditTariff(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={!editTariff?.name||!editTariff?.monthly_price} onClick={()=>void saveTariff()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
  </>;
}

// K3: the admin can only move a delivery to its next allowed step; a courier is assigned with the courier list.
const nextDeliverySteps:Record<string,string[]>={ACCEPTED:['ON_THE_WAY','FAILED'],ON_THE_WAY:['DELIVERED','FAILED']};
export function DeliveryPage(){
  const token=useToken(),l=useL(),enumLabel=useEnumLabel();
  const { confirm, confirmDialog }=useConfirm();
  const [tab,setTab]=useState(0),[status,setStatus]=useState(''),[error,setError]=useState<string|null>(null),[newWorker,setNewWorker]=useState(false);
  const [workerForm,setWorkerForm]=useState({workerId:'',fullName:'',phoneNumber:'',password:'',vehicleType:'',vehicleNumber:''});
  const loader=useCallback((p:number,s:number)=>api.listDeliveryJobs(token,{page:p,page_size:s,status}),[token,status]);
  const x=usePaged(loader);const[workers,setWorkers]=useState<Row[]>([]);
  const loadWorkers=useCallback(async()=>{try{setWorkers(await api.listDeliveryWorkers(token));setError(null);}catch(e){setError(e instanceof Error?e.message:'Error')}},[token]);useEffect(()=>{void loadWorkers()},[loadWorkers]);
  const [returnDraft,setReturnDraft]=useState<{job:Row;reason:string;photo:string}|null>(null),[returnBusy,setReturnBusy]=useState(false),[returnError,setReturnError]=useState<string|null>(null);
  const photoError=(code:string)=>code==='RETURN_PHOTO_TOO_LARGE'?l('Rasm 10 MB dan oshmasin.','Фото должно быть не больше 10 МБ.','Photo must be no larger than 10 MB.'):code==='RETURN_PHOTO_REQUIRED'?l('Qaytarish rasmini qo‘shing.','Добавьте фото возврата.','Add a return photo.'):l('JPEG yoki PNG rasmini tanlang.','Выберите фото JPEG или PNG.','Choose a JPEG or PNG photo.');
  const chooseReturnPhoto=async(file:File)=>{setReturnError(null);setReturnBusy(true);try{const photo=await readReturnPhoto(file);setReturnDraft(v=>v?{...v,photo}:null);}catch(e){setReturnError(photoError(e instanceof Error?e.message:''));}finally{setReturnBusy(false);}};
  const submitReturn=async()=>{if(!returnDraft||!returnDraft.reason||!returnDraft.photo||returnBusy)return;setReturnBusy(true);setReturnError(null);try{await api.updateDeliveryJob(token,returnDraft.job.id,{status:'FAILED',note:returnDraft.reason,photo_base64:returnDraft.photo});setReturnDraft(null);await x.reload();}catch(e){const message=e instanceof Error?e.message:'Error';setReturnError(message.startsWith('RETURN_PHOTO_')?photoError(message):message);}finally{setReturnBusy(false);}};
  const updateJob=async(r:Row,data:Row)=>{if(data.status==='FAILED'){setReturnError(null);setReturnDraft({job:r,reason:'',photo:''});return;}const nextStatus=data.status?enumLabel(data.status):null;const ok=await confirm({danger:['FAILED','CANCELLED'].includes(String(data.status||'')),message:nextStatus?l(`Yetkazma ma’lumotini o‘zgartirib, holatini ${nextStatus} qilishga ishonchingiz komilmi?`,`Вы уверены, что хотите изменить доставку и установить статус «${nextStatus}»?`,`Are you sure you want to update the delivery and set its status to ${nextStatus}?`):l('Yetkazmaga biriktirilgan kuryerni o‘zgartirishga ishonchingiz komilmi?','Вы уверены, что хотите изменить назначенного курьера?','Are you sure you want to change the assigned courier?')});if(!ok)return;try{await api.updateDeliveryJob(token,r.id,data);await x.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const workerStatus=async(r:Row)=>{const disabling=r.status==='ACTIVE';const ok=await confirm({danger:disabling,message:disabling?l('Ushbu kuryerni nofaol qilishga ishonchingiz komilmi?','Вы уверены, что хотите сделать этого курьера неактивным?','Are you sure you want to make this courier inactive?'):l('Ushbu kuryerni faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите активировать этого курьера?','Are you sure you want to enable this courier?')});if(!ok)return;try{await api.setDeliveryWorkerStatus(token,r.id,disabling?'INACTIVE':'ACTIVE');await loadWorkers()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const deleteWorker=async(r:Row)=>{const ok=await confirm({danger:true,message:l(`${r.full_name||r.worker_code} kuryerini butunlay o‘chirishga ishonchingiz komilmi? Bu amalni qaytarib bo‘lmaydi.`,`Вы уверены, что хотите навсегда удалить курьера ${r.full_name||r.worker_code}? Это действие нельзя отменить.`,`Are you sure you want to permanently delete courier ${r.full_name||r.worker_code}? This action cannot be undone.`)});if(!ok)return;try{await api.deleteDeliveryWorker(token,r.id);setWorkers(current=>current.filter(w=>Number(w.id)!==Number(r.id)));setError(null)}catch(e){const message=e instanceof Error?e.message:'Error';setError(message==='COURIER_IS_IN_USE'?l('Bu kuryer yetkazib berish tarixida ishlatilgan. Tarixni saqlash uchun uni butunlay o‘chirib bo‘lmaydi. Uni Nofaol holatda qoldiring.','Этот курьер уже используется в истории доставок. Для сохранения истории его нельзя удалить полностью. Оставьте его неактивным.','This courier is already used in delivery history and cannot be permanently deleted. Keep the courier inactive instead.'):message)}};
  const createWorker=async()=>{try{await api.createDeliveryWorker(token,workerForm);setNewWorker(false);setWorkerForm({workerId:'',fullName:'',phoneNumber:'',password:'',vehicleType:'',vehicleNumber:''});await loadWorkers()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  return <>
    <PageTitle title={l('Yetkazib berish','Доставка','Delivery')} subtitle={l('Kuryerlar va yetkazma ishlarini boshqaring.','Управляйте курьерами и доставками.','Manage couriers and delivery jobs.')} actionLabel={tab===1?l('Kuryer qo‘shish','Добавить курьера','Add courier'):undefined} onAction={tab===1?()=>setNewWorker(true):undefined}/>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Yetkazmalar','Доставки','Jobs')}/><Tab label={l('Kuryerlar','Курьеры','Couriers')}/></Tabs>
    {tab===0?<><TextField select size="small" label={l('Holat','Статус','Status')} value={status} onChange={e=>setStatus(e.target.value)} sx={{minWidth:200,mb:2}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['WAITING_ASSIGNMENT','ACCEPTED','ON_THE_WAY','DELIVERED','FAILED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField><LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Buyurtma','Заказ','Order')}</TableCell><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Kuryer','Курьер','Courier')}</TableCell><TableCell>{l('Manzil','Адрес','Address')}</TableCell><TableCell>{l('Buyurtma holati','Статус заказа','Order status')}</TableCell><TableCell>{l('Yetkazish qadami','Шаг доставки','Delivery step')}</TableCell><TableCell>{l('Yangilangan','Обновлено','Updated')}</TableCell></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id}><TableCell sx={{whiteSpace:'nowrap'}}>№{r.order_id}</TableCell><TableCell>{r.customer_name}</TableCell><TableCell><Select size="small" displayEmpty value={r.delivery_worker_id||''} onChange={e=>void updateJob(r,{delivery_worker_id:Number(e.target.value),status:r.status==='WAITING_ASSIGNMENT'?'ACCEPTED':r.status})}><MenuItem value="">-</MenuItem>{workers.filter(w=>w.status==='ACTIVE').map(w=><MenuItem key={w.id} value={w.id}>{w.full_name}</MenuItem>)}</Select></TableCell><TableCell sx={{maxWidth:260}}>{r.delivery_address}</TableCell><TableCell><StatusChip value={r.order_status}/></TableCell><TableCell><Select size="small" value={r.status} disabled={!(nextDeliverySteps[r.status]||[]).length} onChange={e=>void updateJob(r,{status:e.target.value})}>{[r.status,...(nextDeliverySteps[r.status]||[])].map(v=><MenuItem key={v} value={v} disabled={v===r.status}>{enumLabel(v)}</MenuItem>)}</Select></TableCell><TableCell>{dateTime(r.updated_at)}</TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState></>:<TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Kuryer','Курьер','Courier')}</TableCell><TableCell>{l('Telefon','Телефон','Phone')}</TableCell><TableCell>{l('Transport','Транспорт','Vehicle')}</TableCell><TableCell>{l('Onlayn','Онлайн','Online')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{workers.map(w=><TableRow key={w.id}><TableCell>{w.worker_code}</TableCell><TableCell>{w.full_name}</TableCell><TableCell>{w.phone_number}</TableCell><TableCell>{[w.vehicle_type,w.vehicle_number].filter(Boolean).join(' · ')}</TableCell><TableCell><StatusChip value={w.is_online?'ONLINE':'OFFLINE'}/></TableCell><TableCell><StatusChip value={w.status}/></TableCell><TableCell><Stack direction="row" spacing={1} sx={{alignItems:"center"}}><Button size="small" color={w.status==='ACTIVE'?'warning':'success'} onClick={()=>void workerStatus(w)}>{w.status==='ACTIVE'?l('Nofaol qilish','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button><Tooltip title={l('Kuryerni o‘chirish','Удалить курьера','Delete courier')}><IconButton color="error" size="small" onClick={()=>void deleteWorker(w)}><DeleteRounded/></IconButton></Tooltip></Stack></TableCell></TableRow>)}</TableBody></Table></TablePanel>}
    <Dialog open={!!returnDraft} onClose={()=>{if(!returnBusy)setReturnDraft(null);}} fullWidth maxWidth="sm">
      <DialogTitle>{l('Qaytarish sababi va rasmi','Причина и фото возврата','Return reason and photo')}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{pt:1}}>
        <Alert severity="info">{l('Saqlangach buyurtma qaytarilmoqda holatiga o‘tadi. Tovar ombor qabul qilgandan keyin qoldiqqa qaytadi.','После сохранения заказ перейдёт в возврат. Остаток восстановится после приёмки складом.','Saving starts the return. Stock is restored after warehouse receipt.')}</Alert>
        {returnError&&<Alert severity="error">{returnError}</Alert>}
        <TextField select required disabled={returnBusy} label={l('Sabab','Причина','Reason')} value={returnDraft?.reason||''} onChange={e=>setReturnDraft(v=>v?{...v,reason:e.target.value}:null)}>
          {[l('Mijoz yo‘q','Клиент отсутствует','Customer unavailable'),l('Manzil topilmadi','Адрес не найден','Address not found'),l('Mijoz rad etdi','Клиент отказался','Customer refused')].map(reason=><MenuItem key={reason} value={reason}>{reason}</MenuItem>)}
        </TextField>
        <Button component="label" variant="outlined" disabled={returnBusy}>{l('Rasm qo‘shish','Добавить фото','Add photo')}<input hidden type="file" accept="image/jpeg,image/png" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void chooseReturnPhoto(file);}}/></Button>
        <ReturnEvidence photo={returnDraft?.photo?`data:image/jpeg;base64,${returnDraft.photo}`:null}/>
      </Stack></DialogContent>
      <DialogActions><Button disabled={returnBusy} onClick={()=>setReturnDraft(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={returnBusy||!returnDraft?.reason||!returnDraft?.photo} onClick={()=>void submitReturn()}>{l('Qaytarishni tasdiqlash','Подтвердить возврат','Confirm return')}</Button></DialogActions>
    </Dialog>
    {confirmDialog}
    <Dialog open={newWorker} onClose={()=>setNewWorker(false)} fullWidth maxWidth="xs"><DialogTitle>{l('Yangi kuryer','Новый курьер','New courier')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Kuryer ID','ID курьера','Courier ID')} value={workerForm.workerId} onChange={e=>setWorkerForm(v=>({...v,workerId:e.target.value}))}/><TextField label={l('To‘liq ism','Полное имя','Full name')} value={workerForm.fullName} onChange={e=>setWorkerForm(v=>({...v,fullName:e.target.value}))}/><TextField label={l('Telefon','Телефон','Phone')} value={workerForm.phoneNumber} onChange={e=>setWorkerForm(v=>({...v,phoneNumber:e.target.value}))}/><TextField type="password" helperText={l('Kamida 10 belgi: katta-kichik harf, raqam va belgi','От 10 символов: большие и малые буквы, цифра и знак','At least 10 characters: uppercase, lowercase, number and symbol')} label={l('Parol','Пароль','Password')} value={workerForm.password} onChange={e=>setWorkerForm(v=>({...v,password:e.target.value}))}/><TextField label={l('Transport turi','Тип транспорта','Vehicle type')} value={workerForm.vehicleType} onChange={e=>setWorkerForm(v=>({...v,vehicleType:e.target.value}))}/><TextField label={l('Transport raqami','Номер транспорта','Vehicle number')} value={workerForm.vehicleNumber} onChange={e=>setWorkerForm(v=>({...v,vehicleNumber:e.target.value}))}/></Stack></DialogContent><DialogActions><Button onClick={()=>setNewWorker(false)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={!workerForm.workerId||!workerForm.fullName||!workerForm.password} onClick={()=>void createWorker()}>{l('Yaratish','Создать','Create')}</Button></DialogActions></Dialog>
  </>;
}

const reviewDate = (value: unknown) => dateTime(value).split(' ')[0];

export function ReviewsPage(){
  const token=useToken(),l=useL(),enumLabel=useEnumLabel();
  const [query,setQuery]=useSearchParams();
  const { confirm, confirmDialog }=useConfirm();
  const tab=query.get('tab')==='questions'?1:0;
  const[kind,setKind]=useState('');
  const[search,setSearch]=useState(''),[active,setActive]=useState(''),[questionStatus,setQuestionStatus]=useState(''),[answering,setAnswering]=useState<Row|null>(null),[answer,setAnswer]=useState(''),[error,setError]=useState<string|null>(null);
  const reviewLoader=useCallback((p:number,s:number)=>api.listReviews(token,{page:p,page_size:s,search,active:active===''?undefined:active==='true'}),[token,search,active]);
  const questionLoader=useCallback((p:number,s:number)=>api.listQuestions(token,{page:p,page_size:s,search,status:questionStatus,kind}),[token,search,questionStatus,kind]);
  const reviews=usePaged(reviewLoader), questions=usePaged(questionLoader);
  const toggleReview=async(r:Row)=>{const hiding=Boolean(r.is_active);const ok=await confirm({danger:hiding,message:hiding?l('Ushbu sharhni yashirishga ishonchingiz komilmi?','Вы уверены, что хотите скрыть этот отзыв?','Are you sure you want to hide this review?'):l('Ushbu sharhni qayta ko‘rsatishga ishonchingiz komilmi?','Вы уверены, что хотите снова показать этот отзыв?','Are you sure you want to show this review again?')});if(!ok)return;try{await api.setReviewActive(token,r.id,!r.is_active);await reviews.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const toggleQuestion=async(r:Row)=>{const hiding=Boolean(r.is_active);const ok=await confirm({danger:hiding,message:hiding?l('Ushbu savolni yashirishga ishonchingiz komilmi?','Вы уверены, что хотите скрыть этот вопрос?','Are you sure you want to hide this question?'):l('Ushbu savolni qayta ko‘rsatishga ishonchingiz komilmi?','Вы уверены, что хотите снова показать этот вопрос?','Are you sure you want to show this question again?')});if(!ok)return;try{await api.setQuestionActive(token,r.id,!r.is_active);await questions.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const classify=async(r:Row,kind:string)=>{const ok=await confirm({message:l('Murojaat turini o‘zgartirasizmi?','Изменить тип обращения?','Change the request type?')});if(!ok)return;try{await api.classifyQuestion(token,r.id,kind);await questions.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const saveAnswer=async()=>{if(!answering||!answer.trim())return;try{await api.answerQuestion(token,answering.id,answer.trim());setAnswering(null);setAnswer('');await questions.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  return <>
    <PageTitle title={l('Sharhlar va savollar','Отзывы и вопросы','Reviews & questions')} subtitle={l('Sharhlarni moderatsiya qiling va mahsulot savollariga javob bering.','Модерируйте отзывы и отвечайте на вопросы о товарах.','Moderate reviews and answer product questions.')}/>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_,v)=>setQuery(previous=>{const next=new URLSearchParams(previous);if(v===1)next.set('tab','questions');else next.delete('tab');return next;})} sx={{mb:3}}><Tab label={l('Sharhlar','Отзывы','Reviews')}/><Tab label={l('Savollar / shikoyatlar','Вопросы / жалобы','Questions / complaints')}/></Tabs>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mb:3}}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)}/>{tab===0?<TextField select size="small" label={l('Holat','Статус','Status')} value={active} onChange={e=>setActive(e.target.value)} sx={{minWidth:160}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem><MenuItem value="true">{enumLabel('ACTIVE')}</MenuItem><MenuItem value="false">{enumLabel('HIDDEN')}</MenuItem></TextField>:<TextField select size="small" label={l('Holat','Статус','Status')} value={questionStatus} onChange={e=>setQuestionStatus(e.target.value)} sx={{minWidth:160}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem><MenuItem value="WAITING">{enumLabel('WAITING')}</MenuItem><MenuItem value="ANSWERED">{enumLabel('ANSWERED')}</MenuItem></TextField>}</Stack>
    {tab===1&&<TextField select size="small" label={l('Murojaat turi','Тип обращения','Request type')} value={kind} onChange={e=>setKind(e.target.value)} sx={{minWidth:200,mb:2}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem><MenuItem value="QUESTION">{l('Savol','Вопрос','Question')}</MenuItem><MenuItem value="COMPLAINT">{l('Shikoyat','Жалоба','Complaint')}</MenuItem></TextField>}
    {tab===0?<LoadState loading={reviews.loading} error={reviews.error} onRetry={reviews.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Baho','Оценка','Rating')}</TableCell><TableCell>{l('Sharh','Отзыв','Comment')}</TableCell><TableCell>{l('Vaqt','Время','Time')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{reviews.data.items.map(r=><TableRow key={r.id}><TableCell>{r.customer_name||r.phone_number}</TableCell><TableCell>{r.product_name}</TableCell><TableCell>{'★'.repeat(Math.max(0,Math.min(5,Number(r.rating||0))))}</TableCell><TableCell sx={{maxWidth:420}}>{r.comment||'-'}</TableCell><TableCell>{reviewDate(r.created_at)}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'HIDDEN'}/></TableCell><TableCell><Button size="small" onClick={()=>void toggleReview(r)}>{r.is_active?l('Yashirish','Скрыть','Hide'):l('Ko‘rsatish','Показать','Show')}</Button></TableCell></TableRow>)}</TableBody></Table>{reviews.pagination}</TablePanel></LoadState>:<LoadState loading={questions.loading} error={questions.error} onRetry={questions.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Savol','Вопрос','Question')}</TableCell><TableCell>{l('Javob','Ответ','Answer')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{questions.data.items.map(r=><TableRow key={r.id}><TableCell>{r.customer_name||r.phone_number||'-'}</TableCell><TableCell>{r.product_name||'-'}</TableCell><TableCell sx={{maxWidth:360}}><Select size="small" value={r.kind||'QUESTION'} onChange={e=>void classify(r,String(e.target.value))}><MenuItem value="QUESTION">{l('Savol','Вопрос','Question')}</MenuItem><MenuItem value="COMPLAINT">{l('Shikoyat','Жалоба','Complaint')}</MenuItem></Select><Typography>{r.question}</Typography><Typography variant="caption">{dateTime(r.created_at)}</Typography></TableCell><TableCell sx={{maxWidth:360}}>{r.answer||'-'}</TableCell><TableCell><Stack direction="row" sx={{gap:.5}}><StatusChip value={r.status}/>{!r.is_active&&<StatusChip value="HIDDEN"/>}</Stack></TableCell><TableCell><Stack direction="row" spacing={1}><Button size="small" onClick={()=>{setAnswering(r);setAnswer(r.answer||'')}}>{r.answer?l('Javobni tahrirlash','Изменить ответ','Edit answer'):l('Javob berish','Ответить','Answer')}</Button><Button size="small" color={r.is_active?'error':'success'} onClick={()=>void toggleQuestion(r)}>{r.is_active?l('Yashirish','Скрыть','Hide'):l('Ko‘rsatish','Показать','Show')}</Button></Stack></TableCell></TableRow>)}</TableBody></Table>{questions.pagination}</TablePanel></LoadState>}
    {confirmDialog}
    <Dialog open={!!answering} onClose={()=>setAnswering(null)} fullWidth maxWidth="sm"><DialogTitle>{l('Savolga javob','Ответ на вопрос','Answer question')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Typography sx={{fontWeight:700,mb:2}}>{answering?.question}</Typography><TextField fullWidth multiline minRows={4} label={l('Javob','Ответ','Answer')} value={answer} onChange={e=>setAnswer(e.target.value)}/></DialogContent><DialogActions><Button onClick={()=>setAnswering(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={!answer.trim()} onClick={()=>void saveAnswer()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
  </>;
}

export function PromotionsPage(){
  const token=useToken(),l=useL();
  const { confirm, confirmDialog }=useConfirm();
  const [banners,setBanners]=useState<Row[]>([]);
  const [products,setProducts]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [editIndex,setEditIndex]=useState<number|null>(null);
  const [editProductId,setEditProductId]=useState<number|string>('');
  const [selectedProductIds,setSelectedProductIds]=useState<number[]>([]);
  const [editOpen,setEditOpen]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    setError(null);
    try{
      const firstProducts=await api.listProducts(token,{page:1,page_size:100,active:true});
      let allProducts=[...(firstProducts.items||[])];
      const total=Number(firstProducts.total||allProducts.length);
      const pages=Math.ceil(total/100);
      for(let page=2;page<=pages;page++){
        const next=await api.listProducts(token,{page,page_size:100,active:true});
        allProducts=[...allProducts,...(next.items||[])];
      }
      const bannerRows=await api.listBanners(token);
      const activeProductIds=new Set(allProducts.map(product=>Number(product.id)));
      const visibleBannerRows=(bannerRows||[])
        .filter(row=>Number(row.is_active??1)===1 && activeProductIds.has(Number(row.product_id)))
        .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
      setProducts(allProducts);
      setBanners(visibleBannerRows);
    }catch(e){
      setError(e instanceof Error?e.message:'Error');
    }finally{
      setLoading(false);
    }
  },[token]);

  useEffect(()=>{void load()},[load]);

  const saveBannerList=async(next:Row[])=>{
    setSaving(true);
    setError(null);
    try{
      await api.replaceBanners(token,next.map((item,index)=>({product_id:Number(item.product_id),sort_order:index+1})));
      await load();
      return true;
    }catch(e){
      setError(e instanceof Error?e.message:'Error');
      return false;
    }finally{
      setSaving(false);
    }
  };

  const openAdd=()=>{
    setEditIndex(null);
    setEditProductId('');
    setSelectedProductIds([]);
    setEditOpen(true);
  };

  const openEdit=(index:number)=>{
    setEditIndex(index);
    setEditProductId(Number(banners[index].product_id));
    setSelectedProductIds([]);
    setEditOpen(true);
  };

  const saveEdit=async()=>{
    if(editIndex===null){
      if(selectedProductIds.length===0)return;
      const selectedProducts=selectedProductIds
        .map(id=>products.find(product=>Number(product.id)===Number(id)))
        .filter(Boolean) as Row[];
      if(selectedProducts.length===0)return;
      const ok=await confirm({message:selectedProducts.length===1
        ?l('Tanlangan mahsulotni bosh sahifa banneriga qo‘shishga ishonchingiz komilmi?','Добавить выбранный товар в баннер главной страницы?','Add the selected product to the home page banner?')
        :l(`${selectedProducts.length} ta mahsulotni bosh sahifa banneriga qo‘shishga ishonchingiz komilmi?`,`Добавить ${selectedProducts.length} товаров в баннер главной страницы?`,`Add ${selectedProducts.length} products to the home page banner?`)});
      if(!ok)return;
      const next=[...banners,...selectedProducts.map((selected,index)=>({
        product_id:Number(selected.id),
        product_name:selected.name,
        image_url:selected.image_url,
        price:selected.price,
        sort_order:banners.length+index+1,
        is_active:true,
      }))];
      const saved=await saveBannerList(next);
      if(saved){setEditOpen(false);setSelectedProductIds([]);}
      return;
    }

    if(!editProductId)return;
    const selected=products.find(product=>Number(product.id)===Number(editProductId));
    if(!selected)return;
    const duplicateIndex=banners.findIndex((banner,index)=>Number(banner.product_id)===Number(editProductId) && index!==editIndex);
    if(duplicateIndex>=0){
      setError(l('Bu mahsulot bannerda allaqachon mavjud.','Этот товар уже добавлен в баннер.','This product is already in the banner.'));
      return;
    }
    const ok=await confirm({message:l('Ushbu banner mahsulotini almashtirishga ishonchingiz komilmi?','Заменить товар в этом баннере?','Replace this banner product?')});
    if(!ok)return;
    const next=[...banners];
    next[editIndex]={
      ...next[editIndex],
      product_id:Number(selected.id),
      product_name:selected.name,
      image_url:selected.image_url,
      price:selected.price,
      sort_order:editIndex+1,
      is_active:true,
    };
    const saved=await saveBannerList(next);
    if(saved){setEditOpen(false);setEditIndex(null);setEditProductId('');}
  };

  const removeBanner=async(index:number)=>{
    const item=banners[index];
    const ok=await confirm({danger:true,message:l(`"${item.product_name||''}" mahsulotini bannerdan olib tashlashga ishonchingiz komilmi?`,`Удалить товар «${item.product_name||''}» из баннера?`,`Remove "${item.product_name||''}" from the banner?`)});
    if(!ok)return;
    await saveBannerList(banners.filter((_,i)=>i!==index));
  };

  const moveBanner=async(index:number,direction:-1|1)=>{
    const target=index+direction;
    if(target<0||target>=banners.length)return;
    const next=[...banners];
    [next[index],next[target]]=[next[target],next[index]];
    await saveBannerList(next);
  };

  const bannerProductIds=new Set(banners.map(banner=>Number(banner.product_id)));
  const addableProducts=products.filter(product=>!bannerProductIds.has(Number(product.id)));
  const editSelectableProducts=products.filter(product=>
    Number(product.id)===Number(editProductId)||!bannerProductIds.has(Number(product.id))
  );
  const selectedProducts=products.filter(product=>selectedProductIds.includes(Number(product.id)));

  return <>
    <PageTitle title={l('Banner','Баннер','Banner')}/>
    {error&&<Alert severity="error" sx={{mb:3}} onClose={()=>setError(null)}>{error}</Alert>}

    <LoadState loading={loading} error={null} onRetry={load}>
      <Panel sx={{overflow:'hidden'}}>
        <Box sx={{p:{xs:2.5,md:3}}}>
          <Stack direction={{xs:'column',sm:'row'}} spacing={3} sx={{justifyContent:"space-between",alignItems:{xs:'stretch',sm:'center'}}}>
            <Box>
              <Stack direction="row" spacing={1.5} sx={{alignItems:"baseline",flexWrap:"wrap"}}>
                <Typography sx={{fontWeight:850,fontSize:20}}>{l('Bosh sahifa banneri','Баннер главной страницы','Home page banner')}</Typography>
                <Typography sx={{color:"text.secondary",fontWeight:700}}>{banners.length} {l('ta mahsulot','товаров','products')}</Typography>
              </Stack>
              <Typography sx={{color:"text.secondary",mt:0.75}}>{l('Quyidagi mahsulotlar mobil ilovaning bosh sahifasida banner sifatida ko‘rsatiladi.','Эти товары отображаются в баннере на главной странице мобильного приложения.','These products are displayed in the mobile app home-page banner.')}</Typography>
            </Box>
            <Button variant="contained" startIcon={<AddRounded/>} onClick={openAdd} disabled={saving||addableProducts.length===0} sx={{flexShrink:0,alignSelf:{xs:'stretch',sm:'center'}}}>
              {l('Mahsulotlar qo‘shish','Добавить товары','Add products')}
            </Button>
          </Stack>
        </Box>

        <Box sx={{borderTop:'1px solid',borderColor:'divider'}}>
          {banners.length===0
            ?<Box sx={{py:8,px:3,textAlign:'center'}}>
              <Typography sx={{fontWeight:800,fontSize:18}}>{l('Banner hozircha bo‘sh','Баннер пока пуст','The banner is empty')}</Typography>
              <Typography sx={{color:"text.secondary",mt:1}}>{l('Yuqoridagi “Mahsulotlar qo‘shish” tugmasi orqali bir yoki bir nechta mahsulot tanlang.','Используйте кнопку «Добавить товары» выше, чтобы выбрать один или несколько товаров.','Use the “Add products” button above to select one or more products.')}</Typography>
            </Box>
            :<Box className="admin-table-scroll" sx={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}><Table sx={{minWidth:{xs:720,md:'100%'}}}>
              <TableHead><TableRow><TableCell width={70}>#</TableCell><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell width={110}>{l('Tartib','Порядок','Order')}</TableCell><TableCell align="right" width={230}>{l('Amallar','Действия','Actions')}</TableCell></TableRow></TableHead>
              <TableBody>{banners.map((banner,index)=><TableRow key={banner.id??`${banner.product_id}-${index}`} hover onClick={()=>openEdit(index)} sx={{cursor:'pointer'}}>
                <TableCell>{index+1}</TableCell>
                <TableCell><Stack direction="row" sx={{alignItems:"center",columnGap:2.5}}>
                  <Avatar variant="rounded" src={api.imageUrl(banner.image_url)} sx={{width:62,height:62,bgcolor:'grey.100',flexShrink:0}}/>
                  <Box><Typography sx={{fontWeight:750}}>{banner.product_name||'-'}</Typography><Typography variant="body2" sx={{color:"text.secondary"}}>ID: {banner.product_id}</Typography></Box>
                </Stack></TableCell>
                <TableCell>{money(products.find(product=>Number(product.id)===Number(banner.product_id))?.price)}</TableCell>
                <TableCell>{index+1}</TableCell>
                <TableCell align="right" onClick={event=>event.stopPropagation()}>
                  <Stack direction="row" spacing={0.5} sx={{justifyContent:"flex-end"}}>
                    <Tooltip title={l('Yuqoriga','Вверх','Move up')}><span><Button size="small" disabled={saving||index===0} onClick={()=>void moveBanner(index,-1)}>↑</Button></span></Tooltip>
                    <Tooltip title={l('Pastga','Вниз','Move down')}><span><Button size="small" disabled={saving||index===banners.length-1} onClick={()=>void moveBanner(index,1)}>↓</Button></span></Tooltip>
                    <Tooltip title={l('Tahrirlash','Редактировать','Edit')}><IconButton disabled={saving} onClick={()=>openEdit(index)}><EditRounded/></IconButton></Tooltip>
                    <Tooltip title={l('Olib tashlash','Удалить','Remove')}><IconButton color="error" disabled={saving} onClick={()=>void removeBanner(index)}><DeleteRounded/></IconButton></Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>)}</TableBody>
            </Table></Box>}
        </Box>
      </Panel>
    </LoadState>

    {confirmDialog}

    <Dialog open={editOpen} onClose={()=>{if(!saving)setEditOpen(false)}} fullWidth maxWidth="md">
      <DialogTitle>{editIndex===null?l('Bannerga mahsulotlar qo‘shish','Добавить товары в баннер','Add products to banner'):l('Banner mahsulotini tahrirlash','Редактировать товар баннера','Edit banner product')}</DialogTitle>
      <DialogContent sx={{pt:'20px!important'}}>
        {editIndex===null?<>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={addableProducts}
            value={selectedProducts}
            onChange={(_,value)=>setSelectedProductIds(value.map(product=>Number(product.id)))}
            getOptionLabel={option=>String(option.name||'')}
            isOptionEqualToValue={(option,value)=>Number(option.id)===Number(value.id)}
            disabled={saving}
            noOptionsText={l('Qo‘shish uchun boshqa mahsulot yo‘q','Нет других товаров для добавления','No more products to add')}
            renderOption={(props,product,{selected})=><li {...props} key={product.id}>
              <Checkbox checked={selected} sx={{mr:1}}/>
              <Avatar variant="rounded" src={api.imageUrl(product.image_url)} sx={{width:44,height:44,bgcolor:'grey.100',mr:2}}/>
              <Box><Typography>{product.name}</Typography><Typography variant="caption" sx={{color:"text.secondary"}}>{money(product.price)}</Typography></Box>
            </li>}
            renderInput={params=><TextField {...params} label={l('Mahsulotlarni tanlang','Выберите товары','Select products')} placeholder={l('Qidirish...','Поиск...','Search...')}/>}
          />
          {selectedProducts.length>0&&<Box sx={{mt:3}}>
            <Typography sx={{fontWeight:800,mb:1.5}}>{selectedProducts.length} {l('ta mahsulot tanlandi','товаров выбрано','products selected')}</Typography>
            <Stack spacing={1.25}>{selectedProducts.map(product=><Box key={product.id} sx={{display:'flex',alignItems:'center',p:1.25,border:'1px solid',borderColor:'divider',borderRadius:2}}>
              <Avatar variant="rounded" src={api.imageUrl(product.image_url)} sx={{width:52,height:52,bgcolor:'grey.100',mr:2,flexShrink:0}}/>
              <Box sx={{minWidth:0,flex:1}}><Typography noWrap sx={{fontWeight:750}}>{product.name}</Typography><Typography variant="body2" sx={{color:"text.secondary"}}>{money(product.price)}</Typography></Box>
              <IconButton size="small" color="error" onClick={()=>setSelectedProductIds(ids=>ids.filter(id=>id!==Number(product.id)))} disabled={saving}><DeleteRounded fontSize="small"/></IconButton>
            </Box>)}</Stack>
          </Box>}
        </>:<>
          <Autocomplete
            options={editSelectableProducts}
            value={products.find(product=>Number(product.id)===Number(editProductId))||null}
            onChange={(_,value)=>setEditProductId(value?Number(value.id):'')}
            getOptionLabel={option=>String(option.name||'')}
            isOptionEqualToValue={(option,value)=>Number(option.id)===Number(value.id)}
            disabled={saving}
            renderOption={(props,product)=><li {...props} key={product.id}>
              <Avatar variant="rounded" src={api.imageUrl(product.image_url)} sx={{width:44,height:44,bgcolor:'grey.100',mr:2}}/>
              <Box><Typography>{product.name}</Typography><Typography variant="caption" sx={{color:"text.secondary"}}>{money(product.price)}</Typography></Box>
            </li>}
            renderInput={params=><TextField {...params} label={l('Mahsulot','Товар','Product')} placeholder={l('Qidirish...','Поиск...','Search...')}/>}
          />
        </>}
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={()=>setEditOpen(false)}>{l('Bekor qilish','Отмена','Cancel')}</Button>
        <Button variant="contained" disabled={saving||(editIndex===null?selectedProductIds.length===0:!editProductId)} onClick={()=>void saveEdit()}>{saving?l('Saqlanmoqda...','Сохранение...','Saving...'):l('Saqlash','Сохранить','Save')}</Button>
      </DialogActions>
    </Dialog>

    <Backdrop open={saving} sx={{zIndex:theme=>theme.zIndex.modal+20,color:'#fff'}}><Stack spacing={2} sx={{alignItems:"center"}}><CircularProgress color="inherit"/><Typography sx={{fontWeight:800}}>{l('Saqlanmoqda...','Сохранение...','Saving...')}</Typography></Stack></Backdrop>
  </>;
}

export function SettingsPage(){
 const token=useToken(),l=useL(),enumLabel=useEnumLabel();const{confirm,confirmDialog}=useConfirm();const[tab,setTab]=useState(0),[settings,setSettings]=useState<Row>({}),[admins,setAdmins]=useState<Row[]>([]),[newAdmin,setNewAdmin]=useState(false),[adminForm,setAdminForm]=useState({login_id:'',password:'',name:''}),[message,setMessage]=useState('');
 const [settingsError,setSettingsError]=useState<string|null>(null),[adminsError,setAdminsError]=useState<string|null>(null),[actionError,setActionError]=useState<string|null>(null),[settingsLoading,setSettingsLoading]=useState(false),[adminsLoading,setAdminsLoading]=useState(false);
 const loadSettings=useCallback(async()=>{setSettingsLoading(true);setSettingsError(null);try{setSettings(await api.getSettings(token)||{})}catch(ex){setSettingsError(ex instanceof Error?ex.message:'REQUEST_FAILED')}finally{setSettingsLoading(false)}},[token]);
 const loadAdmins=useCallback(async()=>{setAdminsLoading(true);setAdminsError(null);try{const rows=await api.listAdmins(token);if(!Array.isArray(rows))throw new Error('INVALID_RESPONSE');setAdmins(rows)}catch(ex){setAdminsError(ex instanceof Error?ex.message:'REQUEST_FAILED')}finally{setAdminsLoading(false)}},[token]);
 const load=useCallback(async()=>{await Promise.all([loadSettings(),loadAdmins()])},[loadSettings,loadAdmins]);useEffect(()=>{void load()},[load]);
 const runAction=async(action:()=>Promise<void>)=>{setActionError(null);try{await action()}catch(ex){setActionError(ex instanceof Error?ex.message:'REQUEST_FAILED')}};
 const loadError=l('Ma’lumotlarni yuklab bo‘lmadi. Qayta urinib ko‘ring.','Не удалось загрузить данные. Попробуйте ещё раз.','Could not load the data. Please try again.');

 const saveSettings=async()=>{const ok=await confirm({message:l('Tizim sozlamalarini saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить системные настройки?','Are you sure you want to save the system settings?')});if(!ok)return;await api.updateSettings(token,settings);setMessage(l('Saqlandi','Сохранено','Saved'));};const toggleAdmin=async(a:Row)=>{const disabling=a.status==='ACTIVE';const ok=await confirm({danger:disabling,message:disabling?l('Ushbu administrator hisobini o‘chirishga ishonchingiz komilmi?','Вы уверены, что хотите отключить эту учётную запись администратора?','Are you sure you want to disable this administrator account?'):l('Ushbu administrator hisobini faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите активировать эту учётную запись администратора?','Are you sure you want to enable this administrator account?')});if(!ok)return;await api.setAdminStatus(token,a.id,disabling?'INACTIVE':'ACTIVE');await loadAdmins()};const createAdmin=async()=>{await api.registerAdmin(token,adminForm);setNewAdmin(false);setAdminForm({login_id:'',password:'',name:''});await loadAdmins()};
 return <><PageTitle title={l('Sozlamalar','Настройки','Settings')} subtitle={l('Ilova va administrator hisoblarini boshqaring.','Управляйте приложением и администраторами.','Manage app configuration and administrator accounts.')}/>{message&&<Alert severity="success" sx={{mb:2}} onClose={()=>setMessage('')}>{message}</Alert>}<Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Ilova','Приложение','Application')}/><Tab label={l('Administratorlar','Администраторы','Administrators')}/><Tab label={l('Taymerlar','Таймеры','Timers')}/><Tab label={l('Kirish tarixi','История входов','Login history')}/><Tab label={l('Kuryerlar','Курьеры','Courier assignment')}/></Tabs>{actionError&&<Alert severity="error" sx={{mb:2}} onClose={()=>setActionError(null)}>{actionError==='ADMIN_WEAK_PASSWORD'?l('Parol kamida 10 belgi bo‘lishi va katta-kichik harf, raqam hamda maxsus belgini o‘z ichiga olishi kerak.','Пароль должен содержать не менее 10 символов: большие и малые буквы, цифру и специальный знак.','Password must have at least 10 characters, with uppercase, lowercase, a number and a symbol.'):l('Amal bajarilmadi. Qayta urinib ko‘ring.','Не удалось выполнить действие. Попробуйте ещё раз.','The action failed. Please try again.')}</Alert>}{tab===4?<CourierDispatchSettings/>:tab===3?<LoginAudit/>:tab===2?<TimerSettings/>:tab===0?<LoadState loading={settingsLoading} error={settingsError?loadError:null} onRetry={()=>void loadSettings()}><Panel sx={{p:3,maxWidth:760}}><Stack spacing={3}><TextField label={l('Ilova versiyasi','Версия приложения','App version')} value={settings.app_version||''} onChange={e=>setSettings(v=>({...v,app_version:e.target.value}))}/><FormControlLabel control={<Checkbox checked={settings.force_update_yn==='Y'} onChange={e=>setSettings(v=>({...v,force_update_yn:e.target.checked?'Y':'N'}))}/>} label={l('Majburiy yangilash','Принудительное обновление','Force update')}/><FormControlLabel control={<Checkbox checked={settings.maintenance_yn==='Y'} onChange={e=>setSettings(v=>({...v,maintenance_yn:e.target.checked?'Y':'N'}))}/>} label={l('Texnik xizmat rejimi','Режим обслуживания','Maintenance mode')}/><TextField multiline label={l('Texnik xabar','Сообщение обслуживания','Maintenance message')} value={settings.maintenance_message||''} onChange={e=>setSettings(v=>({...v,maintenance_message:e.target.value}))}/><TextField label="Terms URL" value={settings.terms_url||''} onChange={e=>setSettings(v=>({...v,terms_url:e.target.value}))}/><TextField label="Privacy URL" value={settings.privacy_url||''} onChange={e=>setSettings(v=>({...v,privacy_url:e.target.value}))}/><Button variant="contained" onClick={()=>void runAction(saveSettings)} sx={{alignSelf:'flex-start'}}>{l('Saqlash','Сохранить','Save')}</Button></Stack></Panel></LoadState>:<LoadState loading={adminsLoading} error={adminsError?loadError:null} onRetry={()=>void loadAdmins()}><><Button variant="contained" sx={{mb:2}} onClick={()=>setNewAdmin(true)}>{l('Admin qo‘shish','Добавить админа','Add admin')}</Button><TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Ism','Имя','Name')}</TableCell><TableCell>Login</TableCell><TableCell>{l('Rol','Роль','Role')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{admins.map(a=><TableRow key={a.id}><TableCell>{a.id}</TableCell><TableCell>{a.name}</TableCell><TableCell>{a.login_id}</TableCell><TableCell>{enumLabel(a.role)}</TableCell><TableCell><StatusChip value={a.status}/></TableCell><TableCell><Button size="small" disabled={a.role==='SUPER_ADMIN'} onClick={()=>void runAction(()=>toggleAdmin(a))}>{a.status==='ACTIVE'?l('O‘chirish','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button></TableCell></TableRow>)}</TableBody></Table></TablePanel>{admins.length===0&&<Alert severity="info" sx={{mt:2}}>{l('Administratorlar topilmadi.','Администраторы не найдены.','No administrators found.')}</Alert>}</></LoadState>}{confirmDialog}<Dialog open={newAdmin} onClose={()=>setNewAdmin(false)} fullWidth maxWidth="xs"><DialogTitle>{l('Yangi administrator','Новый администратор','New administrator')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Ism','Имя','Name')} value={adminForm.name} onChange={e=>setAdminForm(v=>({...v,name:e.target.value}))}/><TextField label="Login" value={adminForm.login_id} onChange={e=>setAdminForm(v=>({...v,login_id:e.target.value}))}/><TextField type="password" helperText={l('Kamida 10 belgi: katta-kichik harf, raqam va belgi','От 10 символов: большие и малые буквы, цифра и знак','At least 10 characters: uppercase, lowercase, number and symbol')} label={l('Parol','Пароль','Password')} value={adminForm.password} onChange={e=>setAdminForm(v=>({...v,password:e.target.value}))}/></Stack></DialogContent><DialogActions><Button onClick={()=>setNewAdmin(false)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" onClick={()=>void runAction(createAdmin)}>{l('Yaratish','Создать','Create')}</Button></DialogActions></Dialog></>;
}
