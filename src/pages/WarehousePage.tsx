import { useEffect, useRef, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tabs, TextField, Typography } from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { useAuth } from '../auth/AuthProvider';
import { LoadState, PageTitle, TablePanel, useL } from '../components/AdminCommon';
import { ApiError } from '../api/client';
import { listProducts, type Row, type PageData } from '../api/managementApi';
import * as api from '../api/warehouseApi';

type Line = { product: Row | null; quantity: string; location_id: string };
const emptyPage: PageData = {items: [],total: 0,page: 1,page_size: 20};
const blankLine = (): Line => ({product: null, quantity: '1', location_id: ''});
const number = (n: unknown) => Number(n ?? 0).toLocaleString('en-US');
function time(value: unknown) {
  if (!value) return '—';
  // New warehouse dates are explicit UTC. Existing order timestamps retain their backend format.
  const raw = String(value);
  if (!raw.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

function ProductPicker({token, value, onChange, label}: {token: string;value: Row | null;onChange: (v: Row | null) => void;label: string}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const l = useL();
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true); setFailed(false);
      listProducts(token,{search: query,page_size: 20,active: true}).then(data => {
        if (active) setOptions(data.items);
      }).catch(() => { if (active) { setOptions([]); setFailed(true); } })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [token,query]);
  return <Autocomplete value={value} options={value && !options.some(p => p.id === value.id) ? [value,...options] : options}
    loading={loading} loadingText={l('Yuklanmoqda…','Загрузка…','Loading…')}
    noOptionsText={failed ? l('Yuklab bo‘lmadi. Qayta qidiring.','Не удалось загрузить. Повторите поиск.','Could not load. Search again.') : l('Mahsulot topilmadi','Товар не найден','No products found')}
    filterOptions={items => items} isOptionEqualToValue={(a,b) => a.id === b.id}
    getOptionLabel={p => `${p.name} (${p.barcode || p.sku || p.id})`} onChange={(_,v) => onChange(v)}
    onInputChange={(_,v,reason) => { if (reason === 'input' || reason === 'clear') setQuery(v); }}
    renderInput={params => <TextField {...params} label={label} required />} />;
}

export default function WarehousePage() {
  const token = useAuth().accessToken!;
  const l = useL();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [tab,setTab] = useState(0);
  const [page,setPage] = useState(1);
  const [search,setSearch] = useState('');
  const [searchInput,setSearchInput] = useState('');
  const [productFilter,setProductFilter] = useState<Row | null>(null);
  const [data,setData] = useState<PageData>(emptyPage);
  const [locations,setLocations] = useState<Row[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [actionError,setActionError] = useState('');
  const [revision,setRevision] = useState(0);
  const [busy,setBusy] = useState(false);
  const busyRef = useRef(false);
  const [locationOpen,setLocationOpen] = useState(false);
  const [locationForm,setLocationForm] = useState({code:'',name:'',type:'SHELF'});
  const [receiptOpen,setReceiptOpen] = useState(false);
  const [supplier,setSupplier] = useState('');
  const [invoice,setInvoice] = useState('');
  const [note,setNote] = useState('');
  const [lines,setLines] = useState<Line[]>([blankLine()]);
  const [detail,setDetail] = useState<Row | null>(null);
  const [order,setOrder] = useState<Row | null>(null);
  const [reverseId,setReverseId] = useState<number | null>(null);
  const [reason,setReason] = useState('');

  const explain = (err: unknown) => {
    const code = err instanceof ApiError ? err.resultCode : '';
    const messages: Record<string,[string,string,string]> = {
      WAREHOUSE_NOT_ENABLED: ['Ombor hali faollashtirilmagan.','Склад ещё не включён.','Warehouse is not enabled yet.'],
      WAREHOUSE_INVALID_INPUT: ['Majburiy maydonlarni tekshiring. Miqdor musbat butun son bo‘lishi kerak.','Проверьте обязательные поля. Количество должно быть положительным целым числом.','Check required fields. Quantity must be a positive whole number.'],
      WAREHOUSE_DUPLICATE: ['Bu kod allaqachon mavjud.','Этот код уже существует.','This code already exists.'],
      WAREHOUSE_DUPLICATE_PRODUCT: ['Bir mahsulotni ikki qatorga qo‘shmang.','Не добавляйте один товар дважды.','Do not add the same product twice.'],
      WAREHOUSE_NOT_FOUND: ['Mahsulot, manzil yoki hujjat topilmadi.','Товар, ячейка или документ не найден.','Product, location or document not found.'],
      WAREHOUSE_PRODUCT_INACTIVE: ['Mahsulot nofaol. Uni tekshiring.','Товар неактивен. Проверьте его.','The product is inactive. Check it first.'],
      WAREHOUSE_INVALID_STATE: ['Hujjat holati o‘zgargan. Ro‘yxatni yangilang.','Статус документа изменился. Обновите список.','Document status changed. Refresh the list.'],
      WAREHOUSE_INSUFFICIENT_STOCK: ['Kirimni bekor qilish uchun qoldiq yetarli emas.','Недостаточно остатка для сторно прихода.','There is not enough stock to reverse this receipt.'],
    };
    const message = messages[code || ''];
    return message ? l(...message) : l('Ma’lumotni yuklash yoki saqlashda xatolik. Qayta urinib ko‘ring.','Ошибка загрузки или сохранения. Повторите попытку.','Could not load or save data. Please retry.');
  };
  const label = (kind: unknown) => {
    const labels: Record<string,[string,string,string]> = {
      OPENING:['Boshlang‘ich qoldiq','Начальный остаток','Opening balance'],
      RECEIPT:['Kirim','Приход','Receipt'], RECEIPT_REVERSAL:['Kirim bekor qilindi','Сторно прихода','Receipt reversal'],
      SALE:['Sotuv','Продажа','Sale'], PAYMENT_REFUND:['To‘lov qaytarilishi','Возврат платежа','Payment refund'],
      DRAFT:['Qoralama','Черновик','Draft'], POSTED:['Tasdiqlangan','Подтверждён','Confirmed'],
      REVERSED:['Bekor qilingan','Сторно','Reversed'], SHELF:['Polka','Полка','Shelf'], RECEIVING:['Qabul','Приёмка','Receiving'],
    };
    return labels[String(kind)] ? l(...labels[String(kind)]) : String(kind ?? '—');
  };

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    async function load() {
      try {
        const status = await api.warehouseStatus(token);
        if (!alive) return;
        setEnabled(status.enabled);
        if (!status.enabled) { setData(emptyPage); return; }
        const result = tab === 0 ? await api.stock(token,page,search)
          : tab === 1 ? {items: await api.locations(token),total:0,page:1,page_size:20}
          : tab === 2 ? await api.receipts(token,page)
          : tab === 3 ? await api.movements(token,page,productFilter ? String(productFilter.id) : '')
          : await api.preparation(token,page);
        if (alive) { setData(result); if (tab === 1) setLocations(result.items); }
      } catch (err) { if (alive) { setData(emptyPage); setError(explain(err)); } }
      finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [token,tab,page,search,productFilter?.id,revision]);

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setActionError('');
    try { await action(); }
    catch (err) { setActionError(explain(err)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const refresh = () => setRevision(v => v+1);
  async function openReceipt() {
    await run(async () => {
      setLocations(await api.locations(token));
      setSupplier('');setInvoice('');setNote('');setLines([blankLine()]);setReceiptOpen(true);
    });
  }
  async function saveReceipt() {
    await run(async () => {
      const ids = lines.map(item => item.product?.id);
      if (!supplier.trim() || lines.some(item => !item.product || !item.location_id || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity)<=0) || new Set(ids).size !== ids.length) {
        throw new ApiError('', new Set(ids).size !== ids.length ? 'WAREHOUSE_DUPLICATE_PRODUCT' : 'WAREHOUSE_INVALID_INPUT');
      }
      await api.createReceipt(token,{supplier_name:supplier,invoice_number:invoice,note,
        items:lines.map(item => ({product_id:item.product!.id,quantity:Number(item.quantity),location_id:Number(item.location_id)}))});
      setReceiptOpen(false);refresh();
    });
  }
  const actionAlert = actionError && <Alert severity="error" sx={{mb:2}}>{actionError}</Alert>;
  const productLabel = l('Mahsulot','Товар','Product');
  const quantityLabel = l('Miqdor','Количество','Quantity');
  const cancelLabel = l('Yopish','Закрыть','Close');
  const refreshLabel = l('Yangilash','Обновить','Refresh');
  const heads = tab === 0 ? [productLabel,'SKU',l('Shtrix-kod','Штрихкод','Barcode'),l('Sotuvga mavjud','Доступно для продажи','Available to sell'),l('Faol','Активен','Active')]
    : tab === 1 ? [l('Kod','Код','Code'),l('Nomi','Название','Name'),l('Turi','Тип','Type')]
    : tab === 2 ? [l('Hujjat','Документ','Document'),l('Yetkazib beruvchi','Поставщик','Supplier'),l('Nakladnoy','Накладная','Invoice'),l('Holat','Статус','Status'),l('Sana','Дата','Date'),'']
    : tab === 3 ? [productLabel,l('Harakat','Движение','Movement'),quantityLabel,l('Keyingi qoldiq','Остаток после','Stock after'),l('Asos','Основание','Reference'),l('Kim','Кто','Who'),l('Sana','Дата','Date')]
    : [l('Buyurtma','Заказ','Order'),quantityLabel,l('Buyurtma sanasi','Дата заказа','Order date'),''];

  return <>
    <PageTitle title={l('Ombor','Склад','Warehouse')} />
    <Alert severity="info" sx={{mb:2}}>{l(
      'Bu bosqichda sotuvga mavjud qoldiq hisobga olinadi. Manzil kirimda qayd etiladi; har polkadagi aniq qoldiq va skanerlash keyingi bosqichda qo‘shiladi.',
      'На этом этапе учитывается доступный для продажи остаток. Ячейка фиксируется в приходе; точные остатки по полкам и сканирование появятся на следующем этапе.',
      'This stage tracks stock available to sell. Locations are recorded on receipts; exact shelf balances and scanning follow in the next stage.')}</Alert>
    {actionAlert}
    <Tabs value={tab} onChange={(_,value) => {setTab(value);setPage(1);setData(emptyPage);setActionError('');}} variant="scrollable" scrollButtons="auto">
      {[l('Qoldiq','Остатки','Stock'),l('Manzillar','Ячейки','Locations'),l('Kirimlar','Приходы','Receipts'),l('Harakat tarixi','История движений','Stock history'),l('Tayyorlash navbati','Очередь подготовки','Preparation queue')].map(title => <Tab key={title} label={title} />)}
    </Tabs>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mt:2}}>
      {tab === 0 && <Box component="form" onSubmit={event => {event.preventDefault();setSearch(searchInput);setPage(1);}} sx={{display:'flex',gap:1}}>
        <TextField size="small" label={l('Nomi, SKU yoki shtrix-kod','Название, SKU или штрихкод','Name, SKU or barcode')} value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        <Button type="submit" disabled={loading}>{l('Qidirish','Поиск','Search')}</Button>
      </Box>}
      {tab === 3 && <Box sx={{minWidth:280}}><ProductPicker token={token} value={productFilter} onChange={v => {setProductFilter(v);setPage(1);}} label={productLabel} /></Box>}
      {tab === 1 && <Button variant="contained" disabled={!enabled || busy} onClick={() => {setActionError('');setLocationForm({code:'',name:'',type:'SHELF'});setLocationOpen(true);}}>{l('Manzil qo‘shish','Добавить ячейку','Add location')}</Button>}
      {tab === 2 && <Button variant="contained" disabled={!enabled || busy} onClick={openReceipt}>{l('Kirim yaratish','Создать приход','Create receipt')}</Button>}
      <Button startIcon={<RefreshRounded />} disabled={loading || busy} onClick={refresh}>{refreshLabel}</Button>
    </Stack>
    {!loading && enabled === false && <Alert severity="warning" sx={{mt:2}}>{l('Ombor hali faollashtirilmagan. Backendda ombor migratsiyasi va sozlamasi o‘rnatilishi kerak.','Склад ещё не включён. Нужно установить миграцию и настройку склада на сервере.','Warehouse is not enabled yet. Install the warehouse migration and enable it on the backend.')}</Alert>}
    <LoadState loading={loading} error={error || null} onRetry={refresh}>
      {enabled && <TablePanel><Table><TableHead><TableRow>{heads.map((head,i) => <TableCell key={i}>{head}</TableCell>)}</TableRow></TableHead><TableBody>
        {data.items.map(row => <TableRow key={row.id}>
          {tab === 0 ? <><TableCell>{row.name}</TableCell><TableCell>{row.sku || '—'}</TableCell><TableCell>{row.barcode || '—'}</TableCell><TableCell>{number(row.stock_quantity)}</TableCell><TableCell>{row.is_active ? l('Ha','Да','Yes') : l('Yo‘q','Нет','No')}</TableCell></>
          : tab === 1 ? <><TableCell>{row.code}</TableCell><TableCell>{row.name}</TableCell><TableCell>{label(row.type)}</TableCell></>
          : tab === 2 ? <><TableCell>KR-{row.id}</TableCell><TableCell>{row.supplier_name}</TableCell><TableCell>{row.invoice_number || '—'}</TableCell><TableCell><Chip size="small" label={label(row.status)} /></TableCell><TableCell>{time(row.created_at)}</TableCell><TableCell><Button disabled={busy} onClick={() => run(async () => setDetail(await api.receipt(token,row.id)))}>{l('Ko‘rish','Открыть','View')}</Button></TableCell></>
          : tab === 3 ? <><TableCell>{row.product_name}</TableCell><TableCell>{label(row.kind)}</TableCell><TableCell>{Number(row.quantity_change)>0 ? '+' : ''}{number(row.quantity_change)}</TableCell><TableCell>{number(row.stock_after)}</TableCell><TableCell>{row.reference}</TableCell><TableCell>{row.actor === 'SYSTEM' ? l('Tizim','Система','System') : row.actor}</TableCell><TableCell>{time(row.created_at)}</TableCell></>
          : <><TableCell>{row.order_number}</TableCell><TableCell>{number(row.quantity)}</TableCell><TableCell>{time(row.ordered_at)}</TableCell><TableCell><Button disabled={busy} onClick={() => run(async () => setOrder({...row,items:await api.preparationItems(token,row.id)}))}>{l('Mahsulotlarni ko‘rish','Посмотреть товары','View items')}</Button></TableCell></>}
        </TableRow>)}
        {!data.items.length && <TableRow><TableCell colSpan={heads.length}>{l('Ma’lumot yo‘q','Нет данных','No data')}</TableCell></TableRow>}
      </TableBody></Table>
      {tab !== 1 && <TablePagination component="div" count={data.total} page={page-1} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_,p) => setPage(p+1)} labelDisplayedRows={({from,to,count}) => `${from}–${to} / ${count}`} />}
      </TablePanel>}
    </LoadState>
    {tab === 4 && enabled && <Alert severity="info" sx={{mt:2}}>{l('Navbat to‘langan va hali kuryer qabul qilmagan buyurtmalarni ko‘rsatadi. Hozirgi yetkazish jarayoni ishlashda davom etadi.','Очередь показывает оплаченные заказы, ещё не принятые курьером. Текущий процесс доставки продолжает работать.','The queue shows paid orders not yet accepted by a courier. The current delivery workflow continues to operate.')}</Alert>}

    <Dialog open={locationOpen} onClose={() => {if (!busy) setLocationOpen(false);}} fullWidth maxWidth="sm">
      <DialogTitle>{l('Yangi manzil','Новая ячейка','New location')}</DialogTitle><DialogContent>
        {actionAlert}<Stack spacing={2} sx={{pt:1}}>
          <TextField required label={l('Kod (A-03)','Код (A-03)','Code (A-03)')} value={locationForm.code} onChange={e => setLocationForm({...locationForm,code:e.target.value})} />
          <TextField required label={l('Nomi','Название','Name')} value={locationForm.name} onChange={e => setLocationForm({...locationForm,name:e.target.value})} />
          <TextField select label={l('Turi','Тип','Type')} value={locationForm.type} onChange={e => setLocationForm({...locationForm,type:e.target.value})}>{['SHELF','RECEIVING'].map(type => <MenuItem key={type} value={type}>{label(type)}</MenuItem>)}</TextField>
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setLocationOpen(false)}>{cancelLabel}</Button><Button variant="contained" disabled={busy || !locationForm.code.trim() || !locationForm.name.trim()} onClick={() => run(async () => {await api.createLocation(token,locationForm);setLocationOpen(false);refresh();})}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions>
    </Dialog>
    <Dialog open={receiptOpen} onClose={() => {if (!busy) setReceiptOpen(false);}} fullWidth maxWidth="md">
      <DialogTitle>{l('Yangi kirim','Новый приход','New receipt')}</DialogTitle><DialogContent>{actionAlert}
        <Alert severity="info" sx={{mb:2}}>{l('Qoralama qoldiqni o‘zgartirmaydi. Saqlagandan keyin tekshiring va tasdiqlang.','Черновик не меняет остаток. После сохранения проверьте и подтвердите.','A draft does not change stock. Review and confirm it after saving.')}</Alert>
        {!locations.length && <Alert severity="warning" sx={{mb:2}}>{l('Avval Manzillar bo‘limida manzil yarating.','Сначала создайте ячейку в разделе Ячейки.','Create a location in the Locations tab first.')}</Alert>}
        <Stack spacing={2}>
          <TextField required label={l('Yetkazib beruvchi nomi','Название поставщика','Supplier name')} value={supplier} onChange={e => setSupplier(e.target.value)} />
          <TextField label={l('Nakladnoy raqami','Номер накладной','Invoice number')} value={invoice} onChange={e => setInvoice(e.target.value)} />
          <TextField label={l('Izoh','Примечание','Note')} value={note} onChange={e => setNote(e.target.value)} />
          {lines.map((item,i) => <Box key={i} sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'2fr 1fr 1fr auto'},gap:1,alignItems:'start'}}>
            <ProductPicker token={token} value={item.product} label={productLabel} onChange={v => setLines(previous => previous.map((line,n) => n===i ? {...line,product:v} : line))} />
            <TextField required type="number" label={quantityLabel} value={item.quantity} onChange={e => setLines(previous => previous.map((line,n) => n===i ? {...line,quantity:e.target.value} : line))} />
            <TextField select required label={l('Manzil','Ячейка','Location')} value={item.location_id} onChange={e => setLines(previous => previous.map((line,n) => n===i ? {...line,location_id:e.target.value} : line))}>{locations.filter(location => location.is_active).map(location => <MenuItem key={location.id} value={String(location.id)}>{location.code}</MenuItem>)}</TextField>
            <Button disabled={lines.length===1 || busy} onClick={() => setLines(previous => previous.filter((_,n) => n!==i))}>{l('Olib tashlash','Убрать','Remove')}</Button>
          </Box>)}
          <Button disabled={lines.length>=100 || busy} onClick={() => setLines(previous => [...previous,blankLine()])}>{l('Mahsulot qo‘shish','Добавить товар','Add product')}</Button>
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setReceiptOpen(false)}>{cancelLabel}</Button><Button variant="contained" disabled={busy || !locations.length} onClick={saveReceipt}>{l('Qoralama saqlash','Сохранить черновик','Save draft')}</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(detail)} onClose={() => {if (!busy) setDetail(null);}} fullWidth maxWidth="md">
      <DialogTitle>KR-{detail?.id} · {label(detail?.status)}</DialogTitle><DialogContent>{actionAlert}
        <Typography sx={{mb:1}}>{detail?.supplier_name} · {detail?.invoice_number}</Typography><Typography sx={{mb:2}}>{detail?.note}</Typography>
        <Typography sx={{mb:2}}>{l('Yaratdi','Создал','Created by')}: {detail?.created_by} · {time(detail?.created_at)}{detail?.posted_by && ` · ${l('Tasdiqladi','Подтвердил','Confirmed by')}: ${detail.posted_by}`}</Typography>
        {detail?.status === 'REVERSED' && <Alert severity="info" sx={{mb:2}}>{detail.reversed_by}: {detail.reversal_reason}</Alert>}
        <Table><TableHead><TableRow><TableCell>{productLabel}</TableCell><TableCell>{quantityLabel}</TableCell><TableCell>{l('Manzil','Ячейка','Location')}</TableCell></TableRow></TableHead><TableBody>{(detail?.items || []).map((item:Row) => <TableRow key={item.id}><TableCell>{item.product_name}</TableCell><TableCell>{number(item.quantity)}</TableCell><TableCell>{item.location_code}</TableCell></TableRow>)}</TableBody></Table>
      </DialogContent><DialogActions><Button disabled={busy} onClick={() => setDetail(null)}>{cancelLabel}</Button>
        {detail?.status==='DRAFT' && <Button variant="contained" disabled={busy} onClick={() => run(async () => {await api.postReceipt(token,detail.id);setDetail(await api.receipt(token,detail.id));refresh();})}>{l('Tasdiqlash va qoldiqqa qo‘shish','Подтвердить и добавить в остаток','Confirm and add stock')}</Button>}
        {detail?.status==='POSTED' && <Button color="warning" disabled={busy} onClick={() => {setActionError('');setReverseId(detail.id);setReason('');}}>{l('Kirimni bekor qilish','Сторно','Reverse receipt')}</Button>}
      </DialogActions>
    </Dialog>
    <Dialog open={reverseId!==null} onClose={() => {if (!busy) setReverseId(null);}} fullWidth maxWidth="sm"><DialogTitle>{l('Kirimni bekor qilish','Сторно прихода','Reverse receipt')}</DialogTitle><DialogContent>{actionAlert}<Alert severity="warning" sx={{mb:2}}>{l('Bu kirim orqali qo‘shilgan barcha mahsulotlar soni ombordagi qoldiqdan ayriladi. Kirim haqidagi yozuv tarixda saqlanadi.','Все количества прихода будут вычтены из остатка. Исходный документ сохранится.','All receipt quantities will be removed from available stock. The original document stays in history.')}</Alert><TextField fullWidth required label={l('Sabab','Причина','Reason')} value={reason} onChange={e => setReason(e.target.value)} /></DialogContent><DialogActions><Button disabled={busy} onClick={() => setReverseId(null)}>{cancelLabel}</Button><Button color="warning" variant="contained" disabled={busy || !reason.trim()} onClick={() => run(async () => {await api.reverseReceipt(token,reverseId!,reason);setDetail(await api.receipt(token,reverseId!));setReverseId(null);refresh();})}>{l('Kirimni bekor qilish','Выполнить сторно','Reverse')}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(order)} onClose={() => setOrder(null)} fullWidth maxWidth="sm"><DialogTitle>{order?.order_number}</DialogTitle><DialogContent><Table><TableHead><TableRow><TableCell>{productLabel}</TableCell><TableCell>{quantityLabel}</TableCell><TableCell>{l('Shtrix-kod','Штрихкод','Barcode')}</TableCell></TableRow></TableHead><TableBody>{(order?.items || []).map((item:Row,i:number) => <TableRow key={i}><TableCell>{item.product_name}</TableCell><TableCell>{number(item.quantity)}</TableCell><TableCell>{item.barcode || '—'}</TableCell></TableRow>)}</TableBody></Table></DialogContent><DialogActions><Button onClick={() => setOrder(null)}>{cancelLabel}</Button></DialogActions></Dialog>
  </>;
}
