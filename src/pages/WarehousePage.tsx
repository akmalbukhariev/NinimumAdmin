import {Link as RouterLink} from 'react-router-dom';
import { ListExcelExport } from '../components/ListExcelExport';
import { createWarehouseWorkbook } from '../utils/warehouseWorkbook';
import { useEffect, useRef, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tabs, TextField, Typography } from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { useAuth } from '../auth/AuthProvider';
import { LoadState, PageTitle, StatusChip, TablePanel, useL, dateTime } from '../components/AdminCommon';
import { ApiError } from '../api/client';
import { listProducts, prepareInvoiceImage, type Row, type PageData } from '../api/managementApi';
import * as api from '../api/warehouseApi';

type Line = { product: Row | null; quantity: string; location_id: string; unit_price:string; manufacture_date:string; expiry_date:string; input_unit:string; units_per_block:string; batch_number:string };
const emptyPage: PageData = {items: [],total: 0,page: 1,page_size: 20};
const blankLine = (): Line => ({product: null, quantity: '1', location_id: '', unit_price:'', manufacture_date:'', expiry_date:'', input_unit:'PIECE', units_per_block:'1', batch_number:''});
const number = (n: unknown) => Number(n ?? 0).toLocaleString('en-US');
const time = dateTime;

export function ProductPicker({token, value, onChange, label, activeOnly=true}: {token: string;value: Row | null;onChange: (v: Row | null) => void;label: string;activeOnly?:boolean}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const l = useL();
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true); setFailed(false);
      listProducts(token,{search: query,page_size: 20,active: activeOnly?true:undefined}).then(data => {
        if (active) setOptions(data.items);
      }).catch(() => { if (active) { setOptions([]); setFailed(true); } })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [token,query,activeOnly]);
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
  const [preparationEnabled,setPreparationEnabled] = useState(false);
  const [workerOpen,setWorkerOpen] = useState(false);
  const [workerForm,setWorkerForm] = useState({worker_code:'',full_name:'',password:''});
  const [tab,setTab] = useState(0);
  const [page,setPage] = useState(1);
  const [search,setSearch] = useState('');
  const [searchInput,setSearchInput] = useState('');
  const [movementFrom,setMovementFrom]=useState('');
  const [movementTo,setMovementTo]=useState('');
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
  const [locationForm,setLocationForm] = useState({code:'',name:'',type:'SHELF',hierarchy_level:'BIN',parent_id:''});
  const [receiptOpen,setReceiptOpen] = useState(false);
  const [blindCounts,setBlindCounts]=useState<Row[]|null>(null);
  const [supplier,setSupplier] = useState('');
  const [supplierOptions,setSupplierOptions] = useState<Row[]>([]);
  const [supplierId,setSupplierId] = useState('');
  const [invoiceAmount,setInvoiceAmount] = useState('');
  const [invoiceDate,setInvoiceDate] = useState('');
  const [invoice,setInvoice] = useState('');
  const [invoiceImage,setInvoiceImage]=useState('');
  const [metadataEdit,setMetadataEdit]=useState<Row|null>(null);
  const [note,setNote] = useState('');
  const [lines,setLines] = useState<Line[]>([blankLine()]);
  const [detail,setDetail] = useState<Row | null>(null);
  const [order,setOrder] = useState<Row | null>(null);
  const [reverseId,setReverseId] = useState<number | null>(null);
  const [reason,setReason] = useState('');

  const explain = (err: unknown) => {
    const code = err instanceof ApiError ? err.resultCode : '';
    const messages: Record<string,[string,string,string]> = {
      WAREHOUSE_PREPARATION_DISABLED: ['Ombor ilovasi hali yoqilmagan. warehouse-step2.sql va backend sozlamasini o‘rnating.','Приложение склада ещё не включено. Установите warehouse-step2.sql и настройку сервера.','Warehouse preparation is not enabled. Install warehouse-step2.sql and enable it on the backend.'],
      WAREHOUSE_NOT_READY: ['Buyurtma hali qadoqlanmagan.','Заказ ещё не упакован.','The order is not packed yet.'],
      WAREHOUSE_ORDER_UNAVAILABLE: ['Buyurtma bekor qilingan, to‘lov qaytarilgan yoki kuryerga berilgan.','Заказ отменён, оплата возвращена или заказ передан курьеру.','The order was cancelled, refunded, or handed to a courier.'],
      WAREHOUSE_PASSWORD_SHORT: ['Parol kamida 10 belgi bo‘lishi va katta-kichik harf, raqam hamda maxsus belgini o‘z ichiga olishi kerak.','Пароль должен содержать не менее 10 символов: большие и малые буквы, цифру и специальный знак.','Password must have at least 10 characters, with uppercase, lowercase, a number and a symbol.'],
      WAREHOUSE_NOT_ENABLED: ['Ombor hali faollashtirilmagan.','Склад ещё не включён.','Warehouse is not enabled yet.'],
      WAREHOUSE_BLIND_COUNT_REQUIRED: ['Avval mahsulotlarni ko‘r sanang.','Сначала выполните слепой пересчёт.','Count the products first.'],
      WAREHOUSE_COUNT_MISMATCH: ['Sanash hujjatga mos kelmadi. Qayta sanang; qoldiq o‘zgarmadi.','Пересчёт не совпал с документом. Пересчитайте; остаток не изменён.','Count differs from the document. Recount; stock was not changed.'],
      WAREHOUSE_SEPARATE_APPROVER_REQUIRED: ['Kirimni boshqa xodim tasdiqlashi kerak. Egasi istisno.','Приход должен подтвердить другой сотрудник. Исключение: владелец.','Another employee must approve this receipt. The owner is exempt.'],
      WAREHOUSE_INVALID_HIERARCHY: ['Qator zonaga, javon qatorga tegishli bo‘lishi kerak.','Ряд должен находиться в зоне, ячейка — в ряду.','A row belongs to a zone, and a bin belongs to a row.'],
      WAREHOUSE_RECEIPT_METADATA_REQUIRED: ['Har bir mahsulot uchun kirim narxi va yaroqlilik sanasini kiriting.','Укажите закупочную цену и срок годности каждого товара.','Enter purchase price and expiry for each product.'],
      WAREHOUSE_EXPIRED_BATCH: ['Yaroqlilik sanasi bugundan keyin bo‘lishi kerak.','Срок годности должен быть позже сегодняшней даты.','Expiry must be later than today.'],
      WAREHOUSE_INVALID_INVOICE_IMAGE: ['Rasmni tekshiring (2 MB gacha).','Проверьте изображение (до 2 МБ).','Check the invoice image (up to 2 MB).'],
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
      WAITING:['Navbatda','В очереди','Waiting'], PICKING:['Tayyorlanmoqda','Собирается','Preparing'], BLOCKED:['Muammo bor','Есть проблема','Problem reported'], READY:['Tayyor','Готов','Ready'], ACTIVE:['Faol','Активен','Active'], INACTIVE:['Nofaol','Неактивен','Inactive'],
      CLAIM:['Ish boshlandi','Сборка начата','Preparation started'], BARCODE_CHECK:['Kod tekshirildi','Штрихкод проверен','Barcode checked'], MANUAL_CHECK:['Qo‘lda tekshirildi','Проверено вручную','Manual check'], PROBLEM:['Muammo','Проблема','Problem'], RESUME:['Davom etildi','Сборка продолжена','Resumed'], RESET:['Qayta navbatga qo‘yildi','Возвращён в очередь','Returned to queue'],
      OPENING:['Boshlang‘ich qoldiq','Начальный остаток','Opening balance'],
      RECEIPT:['Kirim','Приход','Receipt'], RECEIPT_REVERSAL:['Kirim bekor qilindi','Сторно прихода','Receipt reversal'],
      SALE:['Sotuv','Продажа','Sale'], PAYMENT_REFUND:['To‘lov qaytarilishi','Возврат платежа','Payment refund'],
      DRAFT:['Qoralama','Черновик','Draft'], POSTED:['Tasdiqlangan','Подтверждён','Confirmed'],
      REVERSED:['Bekor qilingan','Сторно','Reversed'], SHELF:['Polka','Полка','Shelf'], RECEIVING:['Qabul','Приёмка','Receiving'], COLD_STORAGE:['Muzlatgich','Холодильник','Cold storage'], DAMAGED:['Brak','Брак','Damaged'], RETURNS:['Qaytish','Возврат','Returns'], ZONE:['Zona','Зона','Zone'], ROW:['Qator','Ряд','Row'], BIN:['Javon','Ячейка','Bin'],
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
        setEnabled(status.enabled); setPreparationEnabled(Boolean(status.preparation_enabled));
        if (!status.enabled) { setData(emptyPage); return; }
        const result = tab === 0 ? await api.stock(token,page,search)
          : tab === 1 ? {items: await api.locations(token),total:0,page:1,page_size:20}
          : tab === 2 ? await api.receipts(token,page)
          : tab === 3 ? await api.movements(token,page,productFilter ? String(productFilter.id) : '',movementFrom,movementTo)
          : tab === 4 ? (status.preparation_enabled ? await api.packing(token,page) : await api.preparation(token,page))
          : {items:await api.workers(token),total:0,page:1,page_size:20};
        if (alive) { setData(result); if (tab === 1) setLocations(result.items); }
      } catch (err) { if (alive) { setData(emptyPage); setError(explain(err)); } }
      finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [token,tab,page,search,productFilter?.id,movementFrom,movementTo,revision]);

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
      setSupplierOptions(await api.suppliers(token));setSupplierId('');setInvoiceAmount('');setInvoiceDate(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
      setSupplier('');setInvoice('');setInvoiceImage('');setNote('');setLines([blankLine()]);setReceiptOpen(true);
    });
  }
  async function saveReceipt() {
    await run(async () => {
      const ids = lines.map(item => item.product?.id);
      if ((!supplierId && !supplier.trim()) || (supplierId && (!(Number(invoiceAmount)>0) || !invoiceDate || !invoice.trim())) || lines.some(item => !item.product || !item.location_id || !(Number(item.unit_price)>0) || !item.expiry_date || (item.input_unit==='BLOCK'&&(!Number.isInteger(Number(item.units_per_block))||Number(item.units_per_block)<=0)) || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity)<=0) || new Set(ids).size !== ids.length) {
        throw new ApiError('', new Set(ids).size !== ids.length ? 'WAREHOUSE_DUPLICATE_PRODUCT' : 'WAREHOUSE_INVALID_INPUT');
      }
      await api.createReceipt(token,{supplier_name:supplier,supplier_id:supplierId?Number(supplierId):undefined,invoice_amount:supplierId?invoiceAmount:undefined,invoice_date:supplierId?invoiceDate:undefined,invoice_number:invoice,note,invoice_image_base64:invoiceImage||undefined,
        items:lines.map(item => ({product_id:item.product!.id,quantity:Number(item.quantity),location_id:Number(item.location_id),unit_price:item.unit_price,manufacture_date:item.manufacture_date||undefined,expiry_date:item.expiry_date,input_unit:item.input_unit,units_per_block:Number(item.units_per_block),batch_number:item.batch_number}))});
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
    : tab === 4 ? [l('Buyurtma','Заказ','Order'),quantityLabel,l('Buyurtma holati','Статус заказа','Order status'),l('Ombor qadami','Шаг склада','Warehouse step'),l('Xodim','Сотрудник','Worker'),l('Buyurtma sanasi','Дата заказа','Order date'),'']
    : [l('Login','Логин','Login'),l('Ism','Имя','Name'),l('Holat','Статус','Status'),''];

  return <>
    <PageTitle title={l('Ombor','Склад','Warehouse')} />
    <Alert severity="info" sx={{mb:2}}>{l(
      'Bu bosqichda sotuvga mavjud qoldiq hisobga olinadi. Manzil kirimda qayd etiladi; har javondagi aniq qoldiq keyingi bosqichda qo‘shiladi. Buyurtmalar NinimumStock ilovasida tekshiriladi va qadoqlanadi.',
      'На этом этапе учитывается доступный для продажи остаток. Ячейка фиксируется в приходе; точные остатки по полкам появятся позже. Заказы проверяются и упаковываются в NinimumStock.',
      'This stage tracks stock available to sell. Locations are recorded on receipts; exact shelf balances follow later. Orders are checked and packed in NinimumStock.')}</Alert>
    {actionAlert}
    <Button component={RouterLink} to="/inventory" sx={{mb:2}}>{l('Partiya va manzil qoldiqlari','Партии и остатки по ячейкам','Batches and bin stock')}</Button>
    <Tabs value={tab} onChange={(_,value) => {setTab(value);setPage(1);setData(emptyPage);setActionError('');}} variant="scrollable" scrollButtons="auto">
      {[l('Qoldiq','Остатки','Stock'),l('Manzillar','Ячейки','Locations'),l('Kirimlar','Приходы','Receipts'),l('Harakat tarixi','История движений','Stock history'),l('Tayyorlash navbati','Очередь подготовки','Preparation queue'),l('Ombor xodimlari','Сотрудники склада','Warehouse workers')].map(title => <Tab key={title} label={title} />)}
    </Tabs>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mt:2}}>
      {tab === 0 && <Box component="form" onSubmit={event => {event.preventDefault();setSearch(searchInput);setPage(1);}} sx={{display:'flex',gap:1}}>
        <TextField size="small" label={l('Nomi, SKU yoki shtrix-kod','Название, SKU или штрихкод','Name, SKU or barcode')} value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        <Button type="submit" disabled={loading}>{l('Qidirish','Поиск','Search')}</Button>
      </Box>}
      {tab === 3 && <Box sx={{minWidth:280}}><ProductPicker token={token} value={productFilter} onChange={v => {setProductFilter(v);setPage(1);}} label={productLabel} /></Box>}
      {tab === 3 && <>
        <TextField type="date" size="small" label={l('Dan (Toshkent)','С (Ташкент)','From (Tashkent)')} value={movementFrom} slotProps={{inputLabel:{shrink:true}}} onChange={e=>{setMovementFrom(e.target.value);setPage(1);}}/>
        <TextField type="date" size="small" label={l('Gacha (shu kun ham)','По (включительно)','Through (inclusive)')} value={movementTo} slotProps={{inputLabel:{shrink:true}}} onChange={e=>{setMovementTo(e.target.value);setPage(1);}}/>
        <Button onClick={()=>{setMovementFrom('');setMovementTo('');setProductFilter(null);setPage(1);}}>{l('Filtrlarni tozalash','Сбросить фильтры','Clear filters')}</Button>
      </>}
      {tab === 1 && <Button variant="contained" disabled={!enabled || busy} onClick={() => {void api.locations(token).then(setLocations).catch(error=>setActionError(explain(error)));setActionError('');setLocationForm({code:'',name:'',type:'SHELF',hierarchy_level:'BIN',parent_id:''});setLocationOpen(true);}}>{l('Manzil qo‘shish','Добавить ячейку','Add location')}</Button>}
      {tab === 5 && <Button variant="contained" disabled={!preparationEnabled || busy} onClick={() => {setWorkerForm({worker_code:'',full_name:'',password:''});setWorkerOpen(true);}}>{l('Xodim qo‘shish','Добавить сотрудника','Add worker')}</Button>}
      {tab === 2 && <Button variant="contained" disabled={!enabled || busy} onClick={openReceipt}>{l('Kirim yaratish','Создать приход','Create receipt')}</Button>}
      <Button startIcon={<RefreshRounded />} disabled={loading || busy} onClick={refresh}>{refreshLabel}</Button>
    </Stack>
    <ListExcelExport disabled={!enabled||loading||busy} fileName={`warehouse-${tab}.xlsx`} load={async(exportPage)=>{
      if(tab===0)return api.stock(token,exportPage,search);
      if(tab===2)return api.receipts(token,exportPage);
      if(tab===3)return api.movements(token,exportPage,productFilter?String(productFilter.id):'',movementFrom,movementTo);
      if(tab===4)return preparationEnabled?api.packing(token,exportPage):api.preparation(token,exportPage);
      const items=tab===1?await api.locations(token):await api.workers(token);
      return {items,total:items.length,page:1,page_size:items.length};
    }} build={rows=>createWarehouseWorkbook(tab,rows,l,label,{search,product:productFilter?.name||'',date_from:movementFrom,date_to:movementTo})}/>
    {!loading && enabled === false && <Alert severity="warning" sx={{mt:2}}>{l('Ombor hali faollashtirilmagan. Backendda ombor migratsiyasi va sozlamasi o‘rnatilishi kerak.','Склад ещё не включён. Нужно установить миграцию и настройку склада на сервере.','Warehouse is not enabled yet. Install the warehouse migration and enable it on the backend.')}</Alert>}
    <LoadState loading={loading} error={error || null} onRetry={refresh}>
      {enabled && <TablePanel><Table><TableHead><TableRow>{heads.map((head,i) => <TableCell key={i}>{head}</TableCell>)}</TableRow></TableHead><TableBody>
        {data.items.map(row => <TableRow key={row.id}>
          {tab === 0 ? <><TableCell>{row.name}</TableCell><TableCell>{row.sku || '—'}</TableCell><TableCell>{row.barcode || '—'}</TableCell><TableCell>{number(row.stock_quantity)}</TableCell><TableCell>{row.is_active ? l('Ha','Да','Yes') : l('Yo‘q','Нет','No')}</TableCell></>
          : tab === 1 ? <><TableCell>{row.path||row.code}<Typography variant="caption" sx={{display:'block'}}>{label(row.hierarchy_level)}</Typography></TableCell><TableCell>{row.name}</TableCell><TableCell>{label(row.type)}</TableCell></>
          : tab === 2 ? <><TableCell>KR-{row.id}</TableCell><TableCell>{row.supplier_name}</TableCell><TableCell>{row.invoice_number || '—'}</TableCell><TableCell><Chip size="small" label={label(row.status)} /></TableCell><TableCell>{time(row.created_at)}</TableCell><TableCell><Button disabled={busy} onClick={() => run(async () => setDetail(await api.receipt(token,row.id)))}>{l('Ko‘rish','Открыть','View')}</Button></TableCell></>
          : tab === 3 ? <><TableCell>{row.product_name}</TableCell><TableCell>{label(row.kind)}</TableCell><TableCell>{Number(row.quantity_change)>0 ? '+' : ''}{number(row.quantity_change)}</TableCell><TableCell>{number(row.stock_after)}</TableCell><TableCell>{row.reference}</TableCell><TableCell>{row.actor === 'SYSTEM' ? l('Tizim','Система','System') : row.actor}</TableCell><TableCell>{time(row.created_at)}</TableCell></>
          : tab === 4 ? <><TableCell>{row.order_number}</TableCell><TableCell>{number(row.quantity)}</TableCell><TableCell><StatusChip value={row.order_status ?? row.status}/></TableCell><TableCell>{label(row.preparation_status || 'WAITING')}</TableCell><TableCell>{row.worker_code || '—'}</TableCell><TableCell>{time(row.ordered_at)}</TableCell><TableCell><Button disabled={busy} onClick={() => run(async () => setOrder(preparationEnabled ? await api.packingDetail(token,row.id) : {...row,items:await api.preparationItems(token,row.id)}))}>{l('Ko‘rish','Открыть','View')}</Button></TableCell></>
          : <><TableCell>{row.worker_code}</TableCell><TableCell>{row.full_name}</TableCell><TableCell>{label(row.status)}</TableCell><TableCell><Button disabled={busy} onClick={() => run(async () => {await api.updateWorker(token,row.id,{status:row.status==='ACTIVE'?'INACTIVE':'ACTIVE'});refresh();})}>{row.status==='ACTIVE'?l('Faolsizlantirish','Отключить','Deactivate'):l('Faollashtirish','Включить','Activate')}</Button><Button disabled={busy} onClick={() => run(async () => {const password=window.prompt(l('Yangi parol (kamida 10 belgi)','Новый пароль (минимум 10 символов)','New password (at least 10 characters)'));if(password){await api.updateWorker(token,row.id,{password});refresh();}})}>{l('Parolni yangilash','Сменить пароль','Reset password')}</Button></TableCell></>}
        </TableRow>)}
        {!data.items.length && <TableRow><TableCell colSpan={heads.length}>{l('Ma’lumot yo‘q','Нет данных','No data')}</TableCell></TableRow>}
      </TableBody></Table>
      {tab !== 1 && tab !== 5 && <TablePagination component="div" count={data.total} page={page-1} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_,p) => setPage(p+1)} labelDisplayedRows={({from,to,count}) => `${from}–${to} / ${count}`} />}
      </TablePanel>}
    </LoadState>
    {tab === 4 && enabled && <Alert severity="info" sx={{mt:2}}>{l('Bu yerda buyurtmalarni tayyorlash holati va tarixi ko‘rinadi. Ombor ilovasi yoqilganda kuryer faqat tayyor buyurtmani qabul qiladi.','Здесь показаны статусы и история подготовки заказов. При включённом приложении склада курьер принимает только готовый заказ.','This view shows preparation status and order history. When warehouse preparation is enabled, couriers can accept only packed orders.')}</Alert>}

    <Dialog open={locationOpen} onClose={() => {if (!busy) setLocationOpen(false);}} fullWidth maxWidth="sm">
      <DialogTitle>{l('Yangi manzil','Новая ячейка','New location')}</DialogTitle><DialogContent>
        {actionAlert}<Stack spacing={2} sx={{pt:1}}>
          <TextField required label={l('Kod (A-03)','Код (A-03)','Code (A-03)')} value={locationForm.code} onChange={e => setLocationForm({...locationForm,code:e.target.value})} />
          <TextField required label={l('Nomi','Название','Name')} value={locationForm.name} onChange={e => setLocationForm({...locationForm,name:e.target.value})} />
          <TextField select label={l('Daraja','Уровень','Level')} value={locationForm.hierarchy_level} onChange={e=>setLocationForm(v=>({...v,hierarchy_level:e.target.value,parent_id:''}))}>{['ZONE','ROW','BIN'].map(level=><MenuItem key={level} value={level}>{label(level)}</MenuItem>)}</TextField>
          {locationForm.hierarchy_level!=='ZONE'&&<TextField select label={l('Yuqori manzil','Родительская ячейка','Parent location')} value={locationForm.parent_id} onChange={e=>setLocationForm(v=>({...v,parent_id:e.target.value}))}><MenuItem value="">—</MenuItem>{locations.filter(r=>r.is_active&&r.hierarchy_level===(locationForm.hierarchy_level==='ROW'?'ZONE':'ROW')).map(r=><MenuItem key={r.id} value={String(r.id)}>{r.path||r.code}</MenuItem>)}</TextField>}
          <TextField select label={l('Turi','Тип','Type')} value={locationForm.type} onChange={e => setLocationForm({...locationForm,type:e.target.value})}>{['SHELF','RECEIVING','COLD_STORAGE','DAMAGED','PICKING','RETURNS'].map(type => <MenuItem key={type} value={type}>{label(type)}</MenuItem>)}</TextField>
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setLocationOpen(false)}>{cancelLabel}</Button><Button variant="contained" disabled={busy || !locationForm.code.trim() || !locationForm.name.trim()} onClick={() => run(async () => {await api.createLocation(token,{...locationForm,parent_id:locationForm.parent_id?Number(locationForm.parent_id):null});setLocationOpen(false);refresh();})}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions>
    </Dialog>
    <Dialog open={receiptOpen} onClose={() => {if (!busy) setReceiptOpen(false);}} fullWidth maxWidth="md">
      <DialogTitle>{l('Yangi kirim','Новый приход','New receipt')}</DialogTitle><DialogContent>{actionAlert}
        <Alert severity="info" sx={{mb:2}}>{l('Qoralama qoldiqni o‘zgartirmaydi. Saqlagandan keyin tekshiring va tasdiqlang.','Черновик не меняет остаток. После сохранения проверьте и подтвердите.','A draft does not change stock. Review and confirm it after saving.')}</Alert>
        {!locations.length && <Alert severity="warning" sx={{mb:2}}>{l('Avval Manzillar bo‘limida manzil yarating.','Сначала создайте ячейку в разделе Ячейки.','Create a location in the Locations tab first.')}</Alert>}
        <Stack spacing={2}>
          <TextField select label={l('Yetkazib beruvchi','Поставщик','Supplier')} value={supplierId} onChange={e=>setSupplierId(e.target.value)}><MenuItem value="">{l('Ro‘yxatdan tashqari','Вне реестра','Unregistered supplier')}</MenuItem>{supplierOptions.filter(s=>s.is_active).map(s=><MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}</TextField>
          {!supplierId&&<TextField required label={l('Yetkazib beruvchi nomi','Название поставщика','Supplier name')} value={supplier} onChange={e => setSupplier(e.target.value)} />}
          {!!supplierId&&<><TextField required type="number" label={l('Nakladnoy jami summasi','Общая сумма накладной','Invoice total')} value={invoiceAmount} onChange={e=>setInvoiceAmount(e.target.value)}/><TextField required type="date" label={l('Nakladnoy sanasi','Дата накладной','Invoice date')} slotProps={{inputLabel:{shrink:true}}} value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)}/></>}
          <TextField label={l('Nakladnoy raqami','Номер накладной','Invoice number')} value={invoice} onChange={e => setInvoice(e.target.value)} />
          <Button component="label" disabled={busy}>{l('Nakladnoy rasmini tanlash','Фото накладной','Choose invoice photo')}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>setInvoiceImage(await prepareInvoiceImage(file)));e.target.value='';}}/></Button>
          {invoiceImage&&<Box><Box component="img" src={`data:image/png;base64,${invoiceImage}`} sx={{maxHeight:160,maxWidth:'100%'}}/><Button onClick={()=>setInvoiceImage('')}>{l('Rasmni olib tashlash','Удалить фото','Remove photo')}</Button></Box>}
          <TextField label={l('Izoh','Примечание','Note')} value={note} onChange={e => setNote(e.target.value)} />
          {lines.map((item,i) => <Box key={i} sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'2fr 1fr 1fr auto'},gap:1,alignItems:'start'}}>
            <ProductPicker token={token} value={item.product} label={productLabel} onChange={v => setLines(previous => previous.map((line,n) => n===i ? {...line,product:v} : line))} />
            <TextField required type="number" label={quantityLabel} value={item.quantity} onChange={e => setLines(previous => previous.map((line,n) => n===i ? {...line,quantity:e.target.value} : line))} />
            <TextField select required label={l('Manzil','Ячейка','Location')} value={item.location_id} onChange={e => setLines(previous => previous.map((line,n) => n===i ? {...line,location_id:e.target.value} : line))}>{locations.filter(location => location.is_active&&location.hierarchy_level==='BIN').map(location => <MenuItem key={location.id} value={String(location.id)}>{location.path||location.code}</MenuItem>)}</TextField>
            <TextField required type="number" label={l('Kirim narxi (1 dona)','Закупочная цена за штуку','Purchase price per piece')} value={item.unit_price} onChange={e=>setLines(v=>v.map((r,n)=>n===i?{...r,unit_price:e.target.value}:r))}/>
            <TextField select label={l('Birlik','Единица','Unit')} value={item.input_unit} onChange={e=>setLines(v=>v.map((r,n)=>n===i?{...r,input_unit:e.target.value}:r))}><MenuItem value="PIECE">{l('Dona','Штука','Piece')}</MenuItem><MenuItem value="BLOCK">{l('Blok','Блок','Block')}</MenuItem></TextField>
            {item.input_unit==='BLOCK'&&<TextField required type="number" label={l('Blokdagi dona','Штук в блоке','Pieces per block')} value={item.units_per_block} onChange={e=>setLines(v=>v.map((r,n)=>n===i?{...r,units_per_block:e.target.value}:r))}/>}
            <TextField type="date" label={l('Ishlab chiqarilgan','Дата производства','Manufactured')} slotProps={{inputLabel:{shrink:true}}} value={item.manufacture_date} onChange={e=>setLines(v=>v.map((r,n)=>n===i?{...r,manufacture_date:e.target.value}:r))}/>
            <TextField required type="date" label={l('Yaroqlilik sanasi','Годен до','Expiry date')} slotProps={{inputLabel:{shrink:true}}} value={item.expiry_date} onChange={e=>setLines(v=>v.map((r,n)=>n===i?{...r,expiry_date:e.target.value}:r))}/>
            <TextField label={l('Partiya raqami','Номер партии','Batch number')} value={item.batch_number} onChange={e=>setLines(v=>v.map((r,n)=>n===i?{...r,batch_number:e.target.value}:r))}/>
            <Button disabled={lines.length===1 || busy} onClick={() => setLines(previous => previous.filter((_,n) => n!==i))}>{l('Olib tashlash','Убрать','Remove')}</Button>
          </Box>)}
          <Button disabled={lines.length>=100 || busy} onClick={() => setLines(previous => [...previous,blankLine()])}>{l('Mahsulot qo‘shish','Добавить товар','Add product')}</Button>
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setReceiptOpen(false)}>{cancelLabel}</Button><Button variant="contained" disabled={busy || !locations.length} onClick={saveReceipt}>{l('Qoralama saqlash','Сохранить черновик','Save draft')}</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(detail)} onClose={() => {if (!busy) setDetail(null);}} fullWidth maxWidth="md">
      <DialogTitle>KR-{detail?.id} · {label(detail?.status)}</DialogTitle><DialogContent>{actionAlert}
        {detail?.invoice_image_data&&<Box component="img" src={detail.invoice_image_data} alt={l('Nakladnoy','Накладная','Invoice')} sx={{maxWidth:'100%',maxHeight:300,mb:2}}/>}
        <Typography sx={{mb:1}}>{detail?.supplier_name} · {detail?.invoice_number}</Typography><Typography sx={{mb:2}}>{detail?.note}</Typography>
        <Typography sx={{mb:2}}>{l('Yaratdi','Создал','Created by')}: {detail?.created_by} · {time(detail?.created_at)}{detail?.posted_by && ` · ${l('Tasdiqladi','Подтвердил','Confirmed by')}: ${detail.posted_by}`}</Typography>
        {detail?.status === 'REVERSED' && <Alert severity="info" sx={{mb:2}}>{detail.reversed_by}: {detail.reversal_reason}</Alert>}
        <Table><TableHead><TableRow><TableCell>{productLabel}</TableCell><TableCell>{quantityLabel}</TableCell><TableCell>{l('Manzil','Ячейка','Location')}</TableCell></TableRow></TableHead><TableBody>{(detail?.items || []).map((item:Row) => <TableRow key={item.id}><TableCell>{item.product_name}<Typography variant="caption" sx={{display:'block'}}>{item.batch_number||'—'} · {item.unit_price??'—'} UZS / {l('dona','шт.','piece')} · {String(item.expiry_date||'—').slice(0,10)}</Typography>{detail?.status==='DRAFT'&&<Button size="small" onClick={()=>setMetadataEdit({...item,manufacture_date:String(item.manufacture_date||'').slice(0,10),expiry_date:String(item.expiry_date||'').slice(0,10)})}>{l('Narx va sanalar','Цена и даты','Price and dates')}</Button>}</TableCell><TableCell>{item.quantity==null?'—':number(item.quantity)}</TableCell><TableCell>{item.location_code}</TableCell></TableRow>)}</TableBody></Table>
      </DialogContent><DialogActions><Button disabled={busy} onClick={() => setDetail(null)}>{cancelLabel}</Button>
        {detail?.status==='DRAFT' && <Button variant="contained" disabled={busy} onClick={() => {setActionError('');setBlindCounts((detail.items||[]).map((item:Row)=>({product_id:item.product_id,product_name:item.product_name,quantity:''})));}}>{l('Tasdiqlash va qoldiqqa qo‘shish','Подтвердить и добавить в остаток','Confirm and add stock')}</Button>}
        {detail?.status==='POSTED' && <Button color="warning" disabled={busy} onClick={() => {setActionError('');setReverseId(detail.id);setReason('');}}>{l('Kirimni bekor qilish','Сторно','Reverse receipt')}</Button>}
      </DialogActions>
    </Dialog>
    <Dialog open={metadataEdit!==null} onClose={()=>{if(!busy)setMetadataEdit(null)}} fullWidth maxWidth="sm"><DialogTitle>{metadataEdit?.product_name}</DialogTitle><DialogContent>{actionAlert}<Stack spacing={2} sx={{mt:1}}><TextField required type="number" label={l('Kirim narxi (1 dona)','Закупочная цена за штуку','Purchase price per piece')} value={metadataEdit?.unit_price??''} onChange={e=>setMetadataEdit(v=>({...v,unit_price:e.target.value}))}/>{['manufacture_date','expiry_date'].map(key=><TextField key={key} type="date" required={key==='expiry_date'} label={key==='expiry_date'?l('Yaroqlilik sanasi','Годен до','Expiry'):l('Ishlab chiqarilgan','Дата производства','Manufactured')} slotProps={{inputLabel:{shrink:true}}} value={metadataEdit?.[key]||''} onChange={e=>setMetadataEdit(v=>({...v,[key]:e.target.value}))}/>)}<TextField label={l('Partiya raqami','Номер партии','Batch number')} value={metadataEdit?.batch_number||''} onChange={e=>setMetadataEdit(v=>({...v,batch_number:e.target.value}))}/></Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setMetadataEdit(null)}>{cancelLabel}</Button><Button disabled={busy||!metadataEdit?.expiry_date||!(Number(metadataEdit?.unit_price)>0)} onClick={()=>run(async()=>{if(!detail||!metadataEdit)return;await api.updateReceiptMetadata(token,detail.id,metadataEdit.product_id,metadataEdit);setDetail(await api.receipt(token,detail.id));setMetadataEdit(null);})}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
    <Dialog open={blindCounts!==null} onClose={()=>{if(!busy)setBlindCounts(null)}} fullWidth maxWidth="sm"><DialogTitle>{l('Ko‘r sanash','Слепой пересчёт','Blind count')}</DialogTitle><DialogContent>{actionAlert}<Alert severity="info" sx={{mb:2}}>{l('Haqiqiy kelgan sonni kiriting. Hujjatdagi kutilgan son ko‘rsatilmaydi.','Введите фактически полученное количество. Ожидаемое количество скрыто.','Enter the quantity physically received. Expected quantities are hidden.')}</Alert><Stack spacing={2}>{blindCounts?.map((item,index)=><TextField key={item.product_id} type="number" required label={item.product_name} value={item.quantity} onChange={e=>setBlindCounts(v=>v?.map((r,i)=>i===index?{...r,quantity:e.target.value}:r)??null)}/>)}</Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setBlindCounts(null)}>{cancelLabel}</Button><Button disabled={busy||!blindCounts?.length||blindCounts.some(r=>!Number.isInteger(Number(r.quantity))||Number(r.quantity)<=0)} variant="contained" onClick={()=>run(async()=>{if(!detail||!blindCounts)return;await api.postReceipt(token,detail.id,blindCounts.map(r=>({product_id:r.product_id,quantity:Number(r.quantity)})));setBlindCounts(null);setDetail(await api.receipt(token,detail.id));refresh();})}>{l('Sanashni tasdiqlash','Подтвердить пересчёт','Confirm count')}</Button></DialogActions></Dialog>
    <Dialog open={reverseId!==null} onClose={() => {if (!busy) setReverseId(null);}} fullWidth maxWidth="sm"><DialogTitle>{l('Kirimni bekor qilish','Сторно прихода','Reverse receipt')}</DialogTitle><DialogContent>{actionAlert}<Alert severity="warning" sx={{mb:2}}>{l('Bu kirim orqali qo‘shilgan barcha mahsulotlar soni ombordagi qoldiqdan ayriladi. Kirim haqidagi yozuv tarixda saqlanadi.','Все количества прихода будут вычтены из остатка. Исходный документ сохранится.','All receipt quantities will be removed from available stock. The original document stays in history.')}</Alert><TextField fullWidth required label={l('Sabab','Причина','Reason')} value={reason} onChange={e => setReason(e.target.value)} /></DialogContent><DialogActions><Button disabled={busy} onClick={() => setReverseId(null)}>{cancelLabel}</Button><Button color="warning" variant="contained" disabled={busy || !reason.trim()} onClick={() => run(async () => {await api.reverseReceipt(token,reverseId!,reason);setDetail(await api.receipt(token,reverseId!));setReverseId(null);refresh();})}>{l('Kirimni bekor qilish','Выполнить сторно','Reverse')}</Button></DialogActions></Dialog>
    <Dialog open={workerOpen} onClose={() => {if(!busy)setWorkerOpen(false);}} fullWidth maxWidth="sm"><DialogTitle>{l('Ombor xodimi','Сотрудник склада','Warehouse worker')}</DialogTitle><DialogContent>{actionAlert}<Stack spacing={2} sx={{mt:1}}><TextField label={l('Login','Логин','Login')} helperText="A–Z, 0–9, . _ -" value={workerForm.worker_code} onChange={e => setWorkerForm({...workerForm,worker_code:e.target.value})}/><TextField label={l('Ism','Имя','Name')} value={workerForm.full_name} onChange={e => setWorkerForm({...workerForm,full_name:e.target.value})}/><TextField type="password" label={l('Parol (kamida 10 belgi)','Пароль (минимум 10 символов)','Password (at least 10 characters)')} helperText={l('Katta-kichik harf, raqam va maxsus belgi','Большая и малая буква, цифра и специальный знак','Uppercase, lowercase, number and symbol')} value={workerForm.password} onChange={e => setWorkerForm({...workerForm,password:e.target.value})}/></Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setWorkerOpen(false)}>{cancelLabel}</Button><Button disabled={busy || !workerForm.worker_code.trim() || !workerForm.full_name.trim() || workerForm.password.length<10} onClick={() => run(async () => {await api.createWorker(token,workerForm);setWorkerOpen(false);refresh();})}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(order)} onClose={() => setOrder(null)} fullWidth maxWidth="md"><DialogTitle>{order?.order_number}</DialogTitle><DialogContent>{actionAlert}
    <Typography>{label(order?.preparation_status || 'WAITING')} · {order?.worker_code || '—'}</Typography>{order?.note && <Alert severity="warning">{order.note}</Alert>}
    <Table><TableHead><TableRow><TableCell>{productLabel}</TableCell><TableCell>{quantityLabel}</TableCell><TableCell>{l('Tekshirildi','Проверено','Checked')}</TableCell><TableCell>{l('Shtrix-kod','Штрихкод','Barcode')}</TableCell></TableRow></TableHead><TableBody>{(order?.items || []).map((item:Row,i:number) => <TableRow key={i}><TableCell>{item.product_name}</TableCell><TableCell>{number(item.required_quantity ?? item.quantity)}</TableCell><TableCell>{number(item.checked_quantity ?? 0)}</TableCell><TableCell>{item.barcode || '—'}</TableCell></TableRow>)}</TableBody></Table>
    {(order?.events || []).map((event:Row,i:number) => <Typography key={i} sx={{mt:1}}>{time(event.created_at)} · {event.actor} · {label(event.kind)}{event.quantity!=null ? ` · ${event.quantity}` : ''}{event.note ? ` · ${event.note}` : ''}</Typography>)}
    </DialogContent><DialogActions>{preparationEnabled && order?.worker_code && <Button disabled={busy} color="warning" onClick={() => run(async () => {const reason=window.prompt(l('Qayta navbatga qo‘yish sababi. Tekshirilgan sonlar tozalanadi.','Причина возврата в очередь. Проверенные количества сбросятся.','Reason for returning to queue. Checked quantities will be cleared.'));if(reason?.trim()){await api.resetPacking(token,order.id,reason);setOrder(await api.packingDetail(token,order.id));refresh();}})}>{l('Qayta navbatga qo‘yish','Вернуть в очередь','Return to queue')}</Button>}<Button onClick={() => setOrder(null)}>{cancelLabel}</Button></DialogActions></Dialog>
  </>;
}
