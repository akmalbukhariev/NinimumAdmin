import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Alert,Button,Dialog,DialogTitle,DialogContent,DialogActions,Stack,Typography,Tabs,Tab,Table,TableHead,TableBody,TableRow,TableCell,TablePagination,CircularProgress} from '@mui/material';
import {useL,dateTime,money,StatusChip,TablePanel} from './AdminCommon';
import {getCustomerCard,type Row} from '../api/managementApi';

export function CustomerCard({id,token,onClose}:{id:number;token:string;onClose:()=>void}) {
 const l=useL(),navigate=useNavigate();
 const [section,setSection]=useState('orders'),[page,setPage]=useState(0),[data,setData]=useState<Row|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setLoading(true);setError(false);setData(null);getCustomerCard(token,id,section,page+1).then(result=>{if(alive)setData(result)}).catch(()=>{if(alive)setError(true)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[id,token,section,page,retry]);
 const currentData=data?.section===section&&data?.page===page+1?data:null;
 const person=data?.customer;
 const openOrder=(orderId:number)=>{onClose();navigate(`/orders?order=${orderId}`)};
 const headings:Record<string,string[]>={
  orders:[l('Buyurtma','Заказ','Order'),l('Vaqt','Время','Time'),l('Jami','Итого','Total'),l('To‘lov','Оплата','Payment'),l('Holat','Статус','Status')],
  payments:[l('Manba','Источник','Provider'),l('Bog‘lanish','Связь','Reference'),l('Summa','Сумма','Amount'),l('Holat','Статус','Status'),l('To‘langan vaqt','Время оплаты','Paid at')],
  subscriptions:[l('Tarif','Тариф','Tariff'),l('Holat','Статус','Status'),l('Boshlanish','Начало','Start'),l('Tugash','Окончание','End')],
  addresses:[l('Buyurtmalarda ishlatilgan manzil','Адрес в заказах','Address used on orders'),l('Buyurtmalar','Заказы','Orders'),l('Oxirgi foydalanish','Последнее использование','Last used')]
 };
 return <Dialog open onClose={onClose} fullWidth maxWidth="lg"><DialogTitle>{l('Mijoz kartasi','Карточка клиента','Customer card')} №{id}</DialogTitle><DialogContent>
 {person&&<Stack spacing={1} sx={{mb:2}}><Typography variant="h6">{[person.first_name,person.last_name].filter(Boolean).join(' ')||'—'}</Typography><Typography>{person.phone_number||'—'} · {person.email||'—'}</Typography><Typography>{l('Hozirgi manzil','Текущий адрес','Current address')}: {person.address||'—'}</Typography><Typography>{l('Ro‘yxatdan o‘tgan','Регистрация','Registered')}: {dateTime(person.created_at)}</Typography><StatusChip value={person.is_active?'ACTIVE':'INACTIVE'}/></Stack>}
 <Tabs value={section} variant="scrollable" onChange={(_,value)=>{setSection(value);setPage(0)}} sx={{mb:2}}><Tab value="orders" label={l('Buyurtmalar','Заказы','Orders')}/><Tab value="payments" label={l('To‘lov yozuvlari','Записи оплат','Payment records')}/><Tab value="subscriptions" label={l('Obunalar','Подписки','Subscriptions')}/><Tab value="addresses" label={l('Manzillar','Адреса','Addresses')}/></Tabs>
 {loading&&<CircularProgress size={24}/>}{error&&<Alert severity="error" action={<Button onClick={()=>setRetry(v=>v+1)}>{l('Qayta urinish','Повторить','Retry')}</Button>}>{l('Ma’lumotlarni yuklab bo‘lmadi.','Не удалось загрузить данные.','Could not load details.')}</Alert>}
 {currentData&&<><TablePanel><Table size="small"><TableHead><TableRow>{headings[section].map(h=><TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{currentData.items.map((r:Row,index:number)=><TableRow key={r.id??index}>
 {section==='orders'&&<><TableCell><Button onClick={()=>openOrder(r.id)}>№{r.id}</Button></TableCell><TableCell>{dateTime(r.ordered_at)}</TableCell><TableCell>{money(r.total_price)}</TableCell><TableCell><StatusChip value={r.payment_status}/></TableCell><TableCell><StatusChip value={r.status}/></TableCell></>}
 {section==='payments'&&<><TableCell>{r.provider}<Typography variant="caption" sx={{display:'block',overflowWrap:'anywhere'}}>{r.provider_transaction_id||'—'}</Typography></TableCell><TableCell>{r.order_id?<Button onClick={()=>openOrder(r.order_id)}>№{r.order_id}</Button>:r.user_tariff_id?`${l('Obuna','Подписка','Subscription')} №${r.user_tariff_id}`:'—'}</TableCell><TableCell>{money(r.amount)}</TableCell><TableCell><StatusChip value={r.status}/></TableCell><TableCell>{Number(r.payme_perform_time)>0?dateTime(Number(r.payme_perform_time)):'—'}</TableCell></>}
 {section==='subscriptions'&&<><TableCell>{r.tariff_name||'—'}</TableCell><TableCell><StatusChip value={r.status}/></TableCell><TableCell>{r.start_date||'—'}</TableCell><TableCell>{r.end_date||'—'}</TableCell></>}
 {section==='addresses'&&<><TableCell sx={{overflowWrap:'anywhere'}}>{r.address}</TableCell><TableCell>{r.order_count}</TableCell><TableCell>{dateTime(r.last_used)}</TableCell></>}
 </TableRow>)}</TableBody></Table><TablePagination component="div" count={currentData.total} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_,value)=>setPage(value)} labelRowsPerPage={l('Qatorlar','Строки','Rows')}/></TablePanel>{currentData.total===0&&<Typography sx={{mt:2}}>{l('Yozuvlar yo‘q.','Записей нет.','No records.')}</Typography>}</>}
 </DialogContent><DialogActions><Button onClick={()=>setRetry(v=>v+1)} disabled={loading}>{l('Yangilash','Обновить','Refresh')}</Button><Button onClick={onClose}>{l('Yopish','Закрыть','Close')}</Button></DialogActions></Dialog>
}
