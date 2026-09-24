import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Select, Stack, Tab, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import EditRounded from '@mui/icons-material/EditRounded';
import DeleteRounded from '@mui/icons-material/DeleteRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import { useAuth } from '../auth/AuthProvider';
import { LoadState, PageTitle, Panel, StatusChip, TablePanel, dateTime, money, useConfirm, useEnumLabel, useL } from '../components/AdminCommon';
import * as api from '../api/managementApi';
import type { Row } from '../api/managementApi';

const useToken = () => useAuth().accessToken!;
const emptyPage = { items: [] as Row[], total: 0, page: 1, page_size: 20 };
function usePaged(loader:(page:number,pageSize:number)=>Promise<api.PageData>) {
  const l=useL();
  const [data,setData]=useState(emptyPage), [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null);
  const [page,setPage]=useState(0), [pageSize,setPageSize]=useState(20);
  const reload=useCallback(async()=>{setLoading(true);setError(null);try{setData(await loader(page+1,pageSize));}catch(e){setError(e instanceof Error?e.message:'Error');}finally{setLoading(false);}},[loader,page,pageSize]);
  useEffect(()=>{void reload();},[reload]);
  const pagination=<TablePagination component="div" count={data.total} page={page} rowsPerPage={pageSize} onPageChange={(_,p)=>setPage(p)} onRowsPerPageChange={e=>{setPage(0);setPageSize(Number(e.target.value));}} rowsPerPageOptions={[10,20,50,100]} labelRowsPerPage={l('Sahifadagi qatorlar:','Строк на странице:','Rows per page:')} labelDisplayedRows={({from,to,count})=>`${from}–${to} / ${count!==-1?count:`>${to}`}`} />;
  return {data,loading,error,reload,pagination};
}

export function OrdersPage(){
  const token=useToken(), l=useL(), enumLabel=useEnumLabel(); const { confirm, confirmDialog }=useConfirm(); const [search,setSearch]=useState(''),[status,setStatus]=useState('');
  const loader=useCallback((p:number,s:number)=>api.listOrders(token,{page:p,page_size:s,search,status}),[token,search,status]);
  const x=usePaged(loader); const [detail,setDetail]=useState<Row|null>(null),[edit,setEdit]=useState<Row|null>(null);
  const openDetail=async(id:number)=>setDetail(await api.getOrder(token,id));
  const save=async()=>{if(!edit)return; const ok=await confirm({message:l('Buyurtma va to‘lov holatini o‘zgartirishga ishonchingiz komilmi?','Вы уверены, что хотите изменить статус заказа и оплаты?','Are you sure you want to change the order and payment status?')}); if(!ok)return; await api.updateOrderStatus(token,edit.id,{status:edit.status,payment_status:edit.payment_status});setEdit(null);await x.reload();};
  return <><PageTitle title={l('Buyurtmalar','Заказы','Orders')} subtitle={l('Buyurtmalar, to‘lov va holatlarni boshqaring.','Управляйте заказами, оплатой и статусами.','Manage orders, payments and statuses.')} />
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} mb={3}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)} /><TextField select size="small" label={l('Holat','Статус','Status')} value={status} onChange={e=>setStatus(e.target.value)} sx={{minWidth:180}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['PENDING','CONFIRMED','PREPARING','ON_THE_WAY','DELIVERED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField><Button onClick={x.reload} startIcon={<RefreshRounded/>}>{l('Yangilash','Обновить','Refresh')}</Button></Stack>
    <LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>#</TableCell><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Mahsulot','Товары','Items')}</TableCell><TableCell>{l('Summa','Сумма','Total')}</TableCell><TableCell>{l('To‘lov','Оплата','Payment')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell>{l('Vaqt','Время','Time')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id} hover><TableCell>{r.order_number}</TableCell><TableCell>{r.customer_name||r.phone_number||'-'}</TableCell><TableCell>{r.product_count}</TableCell><TableCell>{money(r.total_price)}</TableCell><TableCell><StatusChip value={r.payment_status}/></TableCell><TableCell><StatusChip value={r.status}/></TableCell><TableCell>{dateTime(r.ordered_at)}</TableCell><TableCell><Tooltip title={l('Ko‘rish','Просмотр','View')}><IconButton onClick={()=>void openDetail(r.id)}><VisibilityRounded/></IconButton></Tooltip><IconButton onClick={()=>setEdit({...r})}><EditRounded/></IconButton></TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState>
    <Dialog open={!!edit} onClose={()=>setEdit(null)} fullWidth maxWidth="xs"><DialogTitle>{l('Buyurtma holati','Статус заказа','Order status')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField select label={l('Buyurtma holati','Статус заказа','Order status')} value={edit?.status||''} onChange={e=>setEdit(v=>v&&({...v,status:e.target.value}))}>{['PENDING','CONFIRMED','PREPARING','ON_THE_WAY','DELIVERED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField><TextField select label={l('To‘lov holati','Статус оплаты','Payment status')} value={edit?.payment_status||''} onChange={e=>setEdit(v=>v&&({...v,payment_status:e.target.value}))}>{['PENDING','PAID','FAILED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField></Stack></DialogContent><DialogActions><Button onClick={()=>setEdit(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" onClick={()=>void save()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
    {confirmDialog}
    <Dialog open={!!detail} onClose={()=>setDetail(null)} fullWidth maxWidth="md"><DialogTitle>{detail?.order?.order_number}</DialogTitle><DialogContent><Stack gap={1} mb={2}><Typography>{detail?.order?.customer_name} · {detail?.order?.phone_number}</Typography><Typography color="text.secondary">{detail?.order?.customer_address}</Typography></Stack><Table size="small"><TableHead><TableRow><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Soni','Кол-во','Qty')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell>{l('Jami','Всего','Total')}</TableCell></TableRow></TableHead><TableBody>{detail?.items?.map((i:Row)=><TableRow key={i.id}><TableCell>{i.product_name}</TableCell><TableCell>{i.quantity}</TableCell><TableCell>{money(i.unit_price)}</TableCell><TableCell>{money(i.total_price)}</TableCell></TableRow>)}</TableBody></Table></DialogContent><DialogActions><Button onClick={()=>setDetail(null)}>{l('Yopish','Закрыть','Close')}</Button></DialogActions></Dialog>
  </>;
}

export function ProductsPage() {
  const token = useToken();
  const l = useL();
  const enumLabel = useEnumLabel();
  const { confirm, confirmDialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Row[]>([]);
  const [packages, setPackages] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

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

  useEffect(() => {
    void Promise.all([api.listCategories(token), api.listFiscalPackages(token)]).then(([categoryRows, fiscalRows]) => {
      setCategories(categoryRows);
      setPackages(fiscalRows);
    });
  }, [token]);

  const blankProduct = (): Row => ({
    category_id: '', fiscal_mxik_package_id: '', vat_percent: 12, name: '', short_description: '', description: '',
    sku: '', barcode: '', brand: '', price: '', subscription_price: '', stock_quantity: 0, weight_gram: '',
    is_featured: false,
  });
  const [form, setForm] = useState<Row>(blankProduct);

  const openEdit = async (id: number) => {
    setActionError(null);
    try {
      const detail = await api.getProduct(token, id);
      setEdit({ ...detail.product, images: detail.images ?? [] });
      setEditImages([]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    if (!edit.is_active) {
      const ok = await confirm({ danger: true, message: l('Mahsulot faol emas holatda saqlanadi. Davom etishga ishonchingiz komilmi?', 'Товар будет сохранён неактивным. Вы уверены, что хотите продолжить?', 'This product will be saved as inactive. Are you sure you want to continue?') });
      if (!ok) return;
    }
    setActionError(null);
    try {
      await api.updateProduct(token, edit.id, {
        category_id: edit.category_id,
        fiscal_mxik_package_id: edit.fiscal_mxik_package_id,
        vat_percent: Number(edit.vat_percent ?? 0),
        name: edit.name,
        short_description: edit.short_description ?? '',
        description: edit.description ?? '',
        sku: edit.sku ?? '',
        barcode: edit.barcode ?? '',
        brand: edit.brand ?? '',
        price: Number(edit.price ?? 0),
        subscription_price: edit.subscription_price === '' ? null : Number(edit.subscription_price ?? 0),
        stock_quantity: Number(edit.stock_quantity ?? 0),
        weight_gram: edit.weight_gram === '' ? null : Number(edit.weight_gram ?? 0),
        is_active: Boolean(edit.is_active),
        is_featured: Boolean(edit.is_featured),
      });
      setEdit(null);
      await x.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    }
  };

  const createProduct = async () => {
    setActionError(null);
    try {
      await api.createProduct(token, {
        ...form,
        category_id: Number(form.category_id),
        fiscal_mxik_package_id: Number(form.fiscal_mxik_package_id),
        vat_percent: Number(form.vat_percent),
        price: Number(form.price),
        subscription_price: form.subscription_price === '' ? null : Number(form.subscription_price),
        stock_quantity: Number(form.stock_quantity),
        weight_gram: form.weight_gram === '' ? null : Number(form.weight_gram),
      }, images);
      setCreateOpen(false);
      setForm(blankProduct());
      setImages([]);
      await x.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    }
  };

  const uploadEditImages = async () => {
    if (!edit || editImages.length === 0) return;
    setActionError(null);
    try {
      await api.addProductImages(token, edit.id, editImages);
      const detail = await api.getProduct(token, edit.id);
      setEdit({ ...detail.product, images: detail.images ?? [] });
      setEditImages([]);
      await x.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    }
  };

  const removeEditImage = async (imageId: number) => {
    if (!edit) return;
    const ok = await confirm({ danger: true, message: l('Ushbu mahsulot rasmini o‘chirishga ishonchingiz komilmi?', 'Вы уверены, что хотите удалить это изображение товара?', 'Are you sure you want to delete this product image?') });
    if (!ok) return;
    setActionError(null);
    try {
      await api.deleteProductImage(token, edit.id, imageId);
      const detail = await api.getProduct(token, edit.id);
      setEdit({ ...detail.product, images: detail.images ?? [] });
      await x.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error');
    }
  };

  const formField = (key: string, label: string, type = 'text') => (
    <TextField label={label} type={type} value={form[key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))} />
  );
  const editField = (key: string, label: string, type = 'text') => (
    <TextField label={label} type={type} value={edit?.[key] ?? ''} onChange={(event) => setEdit((value) => value && ({ ...value, [key]: event.target.value }))} />
  );

  return <>
    <PageTitle
      title={l('Mahsulotlar', 'Товары', 'Products')}
      subtitle={l('Narx, ombor, tavsif va mavjudlikni boshqaring.', 'Управляйте ценами, остатками, описанием и доступностью.', 'Manage pricing, stock, descriptions and availability.')}
      actionLabel={l('Mahsulot qo‘shish', 'Добавить товар', 'Add product')}
      onAction={() => { setForm(blankProduct()); setImages([]); setCreateOpen(true); }}
    />
    {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
      <TextField size="small" label={l('Qidirish', 'Поиск', 'Search')} value={search} onChange={(event) => setSearch(event.target.value)} />
      <TextField select size="small" label={l('Kategoriya', 'Категория', 'Category')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} sx={{ minWidth: 200 }}>
        <MenuItem value="">{l('Barchasi', 'Все', 'All')}</MenuItem>
        {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
      </TextField>
      <TextField select size="small" label={l('Mavjudlik', 'Активность', 'Active')} value={active} onChange={(event) => setActive(event.target.value)} sx={{ minWidth: 170 }}>
        <MenuItem value="">{l('Barchasi', 'Все', 'All')}</MenuItem><MenuItem value="true">{enumLabel('ACTIVE')}</MenuItem><MenuItem value="false">{enumLabel('INACTIVE')}</MenuItem>
      </TextField>
    </Stack>

    <LoadState loading={x.loading} error={x.error} onRetry={x.reload}>
      <TablePanel><Table><TableHead><TableRow>
        <TableCell>{l('Mahsulot', 'Товар', 'Product')}</TableCell><TableCell>{l('Kategoriya', 'Категория', 'Category')}</TableCell><TableCell>{l('Narx', 'Цена', 'Price')}</TableCell><TableCell>{l('Obuna narxi', 'Цена подписки', 'Subscription')}</TableCell><TableCell>{l('Ombor', 'Остаток', 'Stock')}</TableCell><TableCell>{l('Holat', 'Статус', 'Status')}</TableCell><TableCell />
      </TableRow></TableHead><TableBody>
        {x.data.items.map((row) => <TableRow key={row.id} hover>
          <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><Avatar variant="rounded" src={api.imageUrl(row.image_url)} sx={{ mr: '28px', flexShrink: 0 }}>{String(row.name || '?')[0]}</Avatar><Box><Typography fontWeight={700}>{row.name}</Typography><Typography variant="caption" color="text.secondary">{row.brand || row.sku || ''}</Typography></Box></Box></TableCell>
          <TableCell>{row.category_name || '-'}</TableCell><TableCell>{money(row.price)}</TableCell><TableCell>{row.subscription_price == null ? '-' : money(row.subscription_price)}</TableCell><TableCell>{row.stock_quantity}</TableCell><TableCell><StatusChip value={row.is_active ? 'ACTIVE' : 'INACTIVE'} /></TableCell><TableCell><IconButton onClick={() => void openEdit(row.id)}><EditRounded /></IconButton></TableCell>
        </TableRow>)}
      </TableBody></Table>{x.pagination}</TablePanel>
    </LoadState>

    <Dialog open={Boolean(edit)} onClose={() => setEdit(null)} fullWidth maxWidth="md">
      <DialogTitle>{l('Mahsulotni tahrirlash', 'Редактировать товар', 'Edit product')}</DialogTitle>
      <DialogContent sx={{ pt: '20px!important' }}><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, columnGap: 3, rowGap: 3, '& .MuiFormControl-root': { minWidth: 0 } }}>
        <TextField select label={l('Kategoriya', 'Категория', 'Category')} value={edit?.category_id ?? ''} onChange={(event) => setEdit((value) => value && ({ ...value, category_id: Number(event.target.value) }))}>{categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField>
        <TextField select label="Fiscal MXIK" value={edit?.fiscal_mxik_package_id ?? ''} onChange={(event) => setEdit((value) => value && ({ ...value, fiscal_mxik_package_id: Number(event.target.value) }))}>{packages.map((item) => <MenuItem key={item.fiscal_mxik_package_id} value={item.fiscal_mxik_package_id}>{item.mxik_code} · {item.package_name}</MenuItem>)}</TextField>
        {editField('name', l('Nomi', 'Название', 'Name'))}{editField('brand', l('Brend', 'Бренд', 'Brand'))}
        {editField('price', l('Narx', 'Цена', 'Price'), 'number')}{editField('subscription_price', l('Obuna narxi', 'Цена подписки', 'Subscription price'), 'number')}
        {editField('stock_quantity', l('Ombor', 'Остаток', 'Stock'), 'number')}{editField('vat_percent', 'VAT %', 'number')}
        {editField('sku', 'SKU')}{editField('barcode', l('Shtrix kod', 'Штрихкод', 'Barcode'))}{editField('weight_gram', l('Og‘irlik (g)', 'Вес (г)', 'Weight (g)'), 'number')}
        <Box display="flex" gap={3} alignItems="center" flexWrap="wrap"><FormControlLabel control={<Checkbox checked={Boolean(edit?.is_active)} onChange={(event) => setEdit((value) => value && ({ ...value, is_active: event.target.checked }))} />} label={l('Faol', 'Активный', 'Active')} /><FormControlLabel control={<Checkbox checked={Boolean(edit?.is_featured)} onChange={(event) => setEdit((value) => value && ({ ...value, is_featured: event.target.checked }))} />} label={l('Tavsiya etilgan', 'Рекомендуемый', 'Featured')} /></Box>
        <TextField label={l('Qisqa tavsif', 'Краткое описание', 'Short description')} value={edit?.short_description ?? ''} onChange={(event) => setEdit((value) => value && ({ ...value, short_description: event.target.value }))} multiline minRows={2} />
        <TextField label={l('Tavsif', 'Описание', 'Description')} value={edit?.description ?? ''} onChange={(event) => setEdit((value) => value && ({ ...value, description: event.target.value }))} multiline minRows={2} />
        <Box gridColumn={{ md: '1 / -1' }}>
          <Typography variant="subtitle2" mb={1}>{l('Mahsulot rasmlari', 'Изображения товара', 'Product images')}</Typography>
          {Array.isArray(edit?.images) && edit.images.length > 0 && <Stack direction="row" gap={1.5} flexWrap="wrap" mb={2}>{edit.images.map((image: Row) => <Box key={image.id} sx={{ position: 'relative', width: 88, height: 88 }}><Avatar variant="rounded" src={api.imageUrl(image.image_url)} sx={{ width: 88, height: 88 }} /><Tooltip title={l('Rasmni o‘chirish', 'Удалить изображение', 'Delete image')}><IconButton size="small" color="error" onClick={() => void removeEditImage(Number(image.id))} sx={{ position: 'absolute', right: 4, top: 4, width: 28, height: 28, bgcolor: 'rgba(255,255,255,.96)', border: '1px solid', borderColor: 'divider', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}><DeleteRounded sx={{ fontSize: 18 }} /></IconButton></Tooltip></Box>)}</Stack>}
          <Stack direction={{xs:'column',sm:'row'}} spacing={1.5} alignItems={{sm:'center'}}>
            <Button component="label" variant="outlined">{l('Rasm qo‘shish', 'Добавить изображения', 'Add images')}<input hidden multiple type="file" accept="image/*" onChange={(event) => setEditImages(Array.from(event.target.files || []))} /></Button>
            <Typography variant="body2" color="text.secondary">{editImages.length} {l('ta tanlandi', 'выбрано', 'selected')}</Typography>
            <Button disabled={editImages.length===0} onClick={() => void uploadEditImages()}>{l('Yuklash', 'Загрузить', 'Upload')}</Button>
          </Stack>
        </Box>
      </Box></DialogContent>
      <DialogActions><Button onClick={() => setEdit(null)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button><Button variant="contained" onClick={() => void saveEdit()}>{l('Saqlash', 'Сохранить', 'Save')}</Button></DialogActions>
    </Dialog>

    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>{l('Yangi mahsulot', 'Новый товар', 'New product')}</DialogTitle>
      <DialogContent sx={{ pt: '20px!important' }}><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, columnGap: 3, rowGap: 3, '& .MuiFormControl-root': { minWidth: 0 } }}>
        <TextField select label={l('Kategoriya', 'Категория', 'Category')} value={form.category_id} onChange={(event) => setForm((value) => ({ ...value, category_id: event.target.value }))}>{categories.filter((category) => category.is_active).map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField>
        <TextField select label="Fiscal MXIK" value={form.fiscal_mxik_package_id} onChange={(event) => setForm((value) => ({ ...value, fiscal_mxik_package_id: event.target.value }))}>{packages.map((item) => <MenuItem key={item.fiscal_mxik_package_id} value={item.fiscal_mxik_package_id}>{item.mxik_code} · {item.package_name}</MenuItem>)}</TextField>
        {formField('name', l('Nomi', 'Название', 'Name'))}{formField('brand', l('Brend', 'Бренд', 'Brand'))}
        {formField('price', l('Narx', 'Цена', 'Price'), 'number')}{formField('subscription_price', l('Obuna narxi', 'Цена подписки', 'Subscription price'), 'number')}
        {formField('stock_quantity', l('Ombor', 'Остаток', 'Stock'), 'number')}{formField('vat_percent', 'VAT %', 'number')}
        {formField('sku', 'SKU')}{formField('barcode', l('Shtrix kod', 'Штрихкод', 'Barcode'))}{formField('weight_gram', l('Og‘irlik (g)', 'Вес (г)', 'Weight (g)'), 'number')}
        <FormControlLabel control={<Checkbox checked={Boolean(form.is_featured)} onChange={(event) => setForm((value) => ({ ...value, is_featured: event.target.checked }))} />} label={l('Tavsiya etilgan', 'Рекомендуемый', 'Featured')} />
        <TextField label={l('Qisqa tavsif', 'Краткое описание', 'Short description')} value={form.short_description} onChange={(event) => setForm((value) => ({ ...value, short_description: event.target.value }))} multiline minRows={2} />
        <TextField label={l('Tavsif', 'Описание', 'Description')} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} multiline minRows={2} />
        <Box><Button component="label" variant="outlined">{l('Rasmlarni tanlash', 'Выбрать изображения', 'Choose images')}<input hidden multiple type="file" accept="image/*" onChange={(event) => setImages(Array.from(event.target.files || []))} /></Button><Typography variant="body2" color="text.secondary" mt={1}>{images.length} {l('ta rasm', 'изобр.', 'images')}</Typography></Box>
      </Box></DialogContent>
      <DialogActions><Button onClick={() => setCreateOpen(false)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button><Button variant="contained" disabled={!form.name || !form.category_id || !form.fiscal_mxik_package_id || !form.price} onClick={() => void createProduct()}>{l('Yaratish', 'Создать', 'Create')}</Button></DialogActions>
    </Dialog>
    {confirmDialog}
  </>;
}

export function CategoriesPage(){
  const token=useToken(),l=useL(); const {confirm,confirmDialog}=useConfirm(); const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[edit,setEdit]=useState<Row|null>(null);
  const load=useCallback(async()=>{setLoading(true);try{setRows(await api.listCategories(token));setError(null);}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setLoading(false)}},[token]); useEffect(()=>{void load()},[load]);
  const startNew=()=>setEdit({id:0,name:'',parent_id:null,image_url:'',sort_order:0,is_active:true}); const save=async()=>{if(!edit)return;if(edit.id&&!edit.is_active){const ok=await confirm({danger:true,message:l('Ushbu kategoriyani faol emas holatda saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить эту категорию неактивной?','Are you sure you want to save this category as inactive?')});if(!ok)return;}if(edit.id)await api.updateCategory(token,edit.id,edit);else await api.createCategory(token,edit);setEdit(null);await load();};
  return <><PageTitle title={l('Kategoriyalar','Категории','Categories')} subtitle={l('Kategoriya va tartibni boshqaring.','Управляйте категориями и порядком.','Manage categories and ordering.')} actionLabel={l('Kategoriya qo‘shish','Добавить категорию','Add category')} onAction={startNew}/><LoadState loading={loading} error={error} onRetry={load}><TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Nomi','Название','Name')}</TableCell><TableCell>{l('Asosiy kategoriya','Родительская категория','Parent category')}</TableCell><TableCell>{l('Tartib','Порядок','Order')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.parent_id||'-'}</TableCell><TableCell>{r.sort_order}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><IconButton onClick={()=>setEdit({...r})}><EditRounded/></IconButton></TableCell></TableRow>)}</TableBody></Table></TablePanel></LoadState><Dialog open={!!edit} onClose={()=>setEdit(null)} fullWidth maxWidth="xs"><DialogTitle>{edit?.id?l('Tahrirlash','Редактировать','Edit'):l('Yangi kategoriya','Новая категория','New category')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Nomi','Название','Name')} value={edit?.name||''} onChange={e=>setEdit(v=>v&&({...v,name:e.target.value}))}/><TextField select label={l('Asosiy kategoriya','Родительская категория','Parent category')} value={edit?.parent_id||''} onChange={e=>setEdit(v=>v&&({...v,parent_id:e.target.value?Number(e.target.value):null}))}><MenuItem value="">-</MenuItem>{rows.filter(r=>r.id!==edit?.id).map(r=><MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}</TextField><TextField type="number" label={l('Tartib','Порядок','Order')} value={edit?.sort_order??0} onChange={e=>setEdit(v=>v&&({...v,sort_order:Number(e.target.value)}))}/><FormControlLabel control={<Checkbox checked={Boolean(edit?.is_active)} onChange={e=>setEdit(v=>v&&({...v,is_active:e.target.checked}))}/>} label={l('Faol','Активна','Active')}/></Stack></DialogContent><DialogActions><Button onClick={()=>setEdit(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" onClick={()=>void save()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>{confirmDialog}</>;
}

export function CustomersPage(){
 const token=useToken(),l=useL(),enumLabel=useEnumLabel();const{confirm,confirmDialog}=useConfirm();const[search,setSearch]=useState(''),[active,setActive]=useState('');const loader=useCallback((p:number,s:number)=>api.listCustomers(token,{page:p,page_size:s,search,active:active===''?undefined:active==='true'}),[token,search,active]);const x=usePaged(loader);
 const toggle=async(r:Row)=>{const ok=await confirm({danger:Boolean(r.is_active),message:r.is_active?l('Ushbu mijozni bloklashga ishonchingiz komilmi?','Вы уверены, что хотите заблокировать этого клиента?','Are you sure you want to block this customer?'):l('Ushbu mijozni qayta faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите снова активировать этого клиента?','Are you sure you want to reactivate this customer?')});if(!ok)return;await api.setCustomerActive(token,r.id,!r.is_active);await x.reload()};
 return <><PageTitle title={l('Mijozlar','Клиенты','Customers')} subtitle={l('Hisoblar va xarid faoliyatini ko‘ring.','Просматривайте аккаунты и покупки.','Review accounts and purchase activity.')}/><Stack direction={{xs:'column',sm:'row'}} spacing={2} mb={3}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)}/><TextField select size="small" label={l('Holat','Статус','Status')} value={active} onChange={e=>setActive(e.target.value)} sx={{minWidth:160}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem><MenuItem value="true">{enumLabel('ACTIVE')}</MenuItem><MenuItem value="false">{enumLabel('INACTIVE')}</MenuItem></TextField></Stack><LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Telefon','Телефон','Phone')}</TableCell><TableCell>Email</TableCell><TableCell>{l('Buyurtmalar','Заказы','Orders')}</TableCell><TableCell>{l('Sarflangan','Потрачено','Spent')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id}><TableCell>{[r.first_name,r.last_name].filter(Boolean).join(' ')||'-'}</TableCell><TableCell>{r.phone_number}</TableCell><TableCell>{r.email||'-'}</TableCell><TableCell>{r.order_count}</TableCell><TableCell>{money(r.total_spent)}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><Button size="small" color={r.is_active?'error':'success'} onClick={()=>void toggle(r)}>{r.is_active?l('Bloklash','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button></TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState>{confirmDialog}</>;
}

export function SubscriptionsPage(){
  const token=useToken(), l=useL(), enumLabel=useEnumLabel();
  const { confirm, confirmDialog }=useConfirm();
  const [tab,setTab]=useState(0), [status,setStatus]=useState(''), [search,setSearch]=useState('');
  const loader=useCallback((p:number,s:number)=>api.listSubscriptions(token,{page:p,page_size:s,status,search}),[token,status,search]);
  const x=usePaged(loader);
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
      <Stack direction={{xs:'column',sm:'row'}} spacing={2} mb={3}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)}/><TextField select size="small" label={l('Holat','Статус','Status')} value={status} onChange={e=>setStatus(e.target.value)} sx={{minWidth:170}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['PENDING','ACTIVE','CANCELLED','EXPIRED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField></Stack>
      <LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Tarif','Тариф','Tariff')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell>{l('Boshlanish','Начало','Start')}</TableCell><TableCell>{l('Tugash','Конец','End')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id}><TableCell>{r.customer_name||r.phone_number}</TableCell><TableCell>{r.tariff_name}</TableCell><TableCell>{money(r.monthly_price)}</TableCell><TableCell>{dateTime(r.start_date)}</TableCell><TableCell>{dateTime(r.end_date)}</TableCell><TableCell><StatusChip value={r.status}/></TableCell><TableCell><Select size="small" value={r.status} onChange={e=>void subStatus(r,String(e.target.value))}>{['PENDING','ACTIVE','CANCELLED','EXPIRED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</Select></TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState>
    </>:<TablePanel><Table><TableHead><TableRow><TableCell>{l('Tarif','Тариф','Tariff')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell>{l('Muddat','Срок','Duration')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{tariffs.map(r=><TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{money(r.monthly_price)}</TableCell><TableCell>{r.duration_months} {l('oy','мес.','months')}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><IconButton onClick={()=>setEditTariff({...r})}><EditRounded/></IconButton></TableCell></TableRow>)}</TableBody></Table></TablePanel>}
    {confirmDialog}
    <Dialog open={!!editTariff} onClose={()=>setEditTariff(null)} fullWidth maxWidth="xs"><DialogTitle>{editTariff?.id?l('Tarifni tahrirlash','Редактировать тариф','Edit tariff'):l('Yangi tarif','Новый тариф','New tariff')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Nomi','Название','Name')} value={editTariff?.name||''} onChange={e=>setEditTariff(v=>v&&({...v,name:e.target.value}))}/><TextField type="number" label={l('Oylik narx','Месячная цена','Monthly price')} value={editTariff?.monthly_price??''} onChange={e=>setEditTariff(v=>v&&({...v,monthly_price:Number(e.target.value)}))}/><TextField type="number" label={l('Oylar','Месяцы','Months')} value={editTariff?.duration_months??1} onChange={e=>setEditTariff(v=>v&&({...v,duration_months:Number(e.target.value)}))}/><TextField multiline label={l('Tavsif','Описание','Description')} value={editTariff?.description||''} onChange={e=>setEditTariff(v=>v&&({...v,description:e.target.value}))}/><FormControlLabel control={<Checkbox checked={Boolean(editTariff?.is_active)} onChange={e=>setEditTariff(v=>v&&({...v,is_active:e.target.checked}))}/>} label={l('Faol','Активен','Active')}/></Stack></DialogContent><DialogActions><Button onClick={()=>setEditTariff(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={!editTariff?.name||!editTariff?.monthly_price} onClick={()=>void saveTariff()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
  </>;
}

export function DeliveryPage(){
  const token=useToken(),l=useL(),enumLabel=useEnumLabel();
  const { confirm, confirmDialog }=useConfirm();
  const [tab,setTab]=useState(0),[status,setStatus]=useState(''),[error,setError]=useState<string|null>(null),[newWorker,setNewWorker]=useState(false);
  const [workerForm,setWorkerForm]=useState({workerId:'',fullName:'',phoneNumber:'',password:'',vehicleType:'',vehicleNumber:''});
  const loader=useCallback((p:number,s:number)=>api.listDeliveryJobs(token,{page:p,page_size:s,status}),[token,status]);
  const x=usePaged(loader);const[workers,setWorkers]=useState<Row[]>([]);
  const loadWorkers=useCallback(async()=>{try{setWorkers(await api.listDeliveryWorkers(token));setError(null);}catch(e){setError(e instanceof Error?e.message:'Error')}},[token]);useEffect(()=>{void loadWorkers()},[loadWorkers]);
  const updateJob=async(r:Row,data:Row)=>{const nextStatus=data.status?enumLabel(data.status):null;const ok=await confirm({danger:['FAILED','CANCELLED'].includes(String(data.status||'')),message:nextStatus?l(`Yetkazma ma’lumotini o‘zgartirib, holatini ${nextStatus} qilishga ishonchingiz komilmi?`,`Вы уверены, что хотите изменить доставку и установить статус «${nextStatus}»?`,`Are you sure you want to update the delivery and set its status to ${nextStatus}?`):l('Yetkazmaga biriktirilgan kuryerni o‘zgartirishga ishonchingiz komilmi?','Вы уверены, что хотите изменить назначенного курьера?','Are you sure you want to change the assigned courier?')});if(!ok)return;try{await api.updateDeliveryJob(token,r.id,data);await x.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const workerStatus=async(r:Row)=>{const disabling=r.status==='ACTIVE';const ok=await confirm({danger:disabling,message:disabling?l('Ushbu kuryerni o‘chirishga ishonchingiz komilmi?','Вы уверены, что хотите отключить этого курьера?','Are you sure you want to disable this courier?'):l('Ushbu kuryerni faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите активировать этого курьера?','Are you sure you want to enable this courier?')});if(!ok)return;try{await api.setDeliveryWorkerStatus(token,r.id,disabling?'INACTIVE':'ACTIVE');await loadWorkers()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const createWorker=async()=>{try{await api.createDeliveryWorker(token,workerForm);setNewWorker(false);setWorkerForm({workerId:'',fullName:'',phoneNumber:'',password:'',vehicleType:'',vehicleNumber:''});await loadWorkers()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  return <>
    <PageTitle title={l('Yetkazib berish','Доставка','Delivery')} subtitle={l('Kuryerlar va yetkazma ishlarini boshqaring.','Управляйте курьерами и доставками.','Manage couriers and delivery jobs.')} actionLabel={tab===1?l('Kuryer qo‘shish','Добавить курьера','Add courier'):undefined} onAction={tab===1?()=>setNewWorker(true):undefined}/>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Yetkazmalar','Доставки','Jobs')}/><Tab label={l('Kuryerlar','Курьеры','Couriers')}/></Tabs>
    {tab===0?<><TextField select size="small" label={l('Holat','Статус','Status')} value={status} onChange={e=>setStatus(e.target.value)} sx={{minWidth:200,mb:2}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['WAITING_ASSIGNMENT','ACCEPTED','ON_THE_WAY','DELIVERED','FAILED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField><LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Buyurtma','Заказ','Order')}</TableCell><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Kuryer','Курьер','Courier')}</TableCell><TableCell>{l('Manzil','Адрес','Address')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell>{l('Yangilangan','Обновлено','Updated')}</TableCell></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id}><TableCell>{r.order_number}</TableCell><TableCell>{r.customer_name}</TableCell><TableCell><Select size="small" displayEmpty value={r.delivery_worker_id||''} onChange={e=>void updateJob(r,{delivery_worker_id:Number(e.target.value),status:r.status==='WAITING_ASSIGNMENT'?'ACCEPTED':r.status})}><MenuItem value="">-</MenuItem>{workers.filter(w=>w.status==='ACTIVE').map(w=><MenuItem key={w.id} value={w.id}>{w.full_name}</MenuItem>)}</Select></TableCell><TableCell sx={{maxWidth:260}}>{r.delivery_address}</TableCell><TableCell><Select size="small" value={r.status} onChange={e=>void updateJob(r,{status:e.target.value})}>{['WAITING_ASSIGNMENT','ACCEPTED','ON_THE_WAY','DELIVERED','FAILED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</Select></TableCell><TableCell>{dateTime(r.updated_at)}</TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState></>:<TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Kuryer','Курьер','Courier')}</TableCell><TableCell>{l('Telefon','Телефон','Phone')}</TableCell><TableCell>{l('Transport','Транспорт','Vehicle')}</TableCell><TableCell>{l('Onlayn','Онлайн','Online')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{workers.map(w=><TableRow key={w.id}><TableCell>{w.worker_code}</TableCell><TableCell>{w.full_name}</TableCell><TableCell>{w.phone_number}</TableCell><TableCell>{[w.vehicle_type,w.vehicle_number].filter(Boolean).join(' · ')}</TableCell><TableCell><StatusChip value={w.is_online?'ONLINE':'OFFLINE'}/></TableCell><TableCell><StatusChip value={w.status}/></TableCell><TableCell><Button size="small" color={w.status==='ACTIVE'?'error':'success'} onClick={()=>void workerStatus(w)}>{w.status==='ACTIVE'?l('O‘chirish','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button></TableCell></TableRow>)}</TableBody></Table></TablePanel>}
    {confirmDialog}
    <Dialog open={newWorker} onClose={()=>setNewWorker(false)} fullWidth maxWidth="xs"><DialogTitle>{l('Yangi kuryer','Новый курьер','New courier')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Kuryer ID','ID курьера','Courier ID')} value={workerForm.workerId} onChange={e=>setWorkerForm(v=>({...v,workerId:e.target.value}))}/><TextField label={l('To‘liq ism','Полное имя','Full name')} value={workerForm.fullName} onChange={e=>setWorkerForm(v=>({...v,fullName:e.target.value}))}/><TextField label={l('Telefon','Телефон','Phone')} value={workerForm.phoneNumber} onChange={e=>setWorkerForm(v=>({...v,phoneNumber:e.target.value}))}/><TextField type="password" label={l('Parol','Пароль','Password')} value={workerForm.password} onChange={e=>setWorkerForm(v=>({...v,password:e.target.value}))}/><TextField label={l('Transport turi','Тип транспорта','Vehicle type')} value={workerForm.vehicleType} onChange={e=>setWorkerForm(v=>({...v,vehicleType:e.target.value}))}/><TextField label={l('Transport raqami','Номер транспорта','Vehicle number')} value={workerForm.vehicleNumber} onChange={e=>setWorkerForm(v=>({...v,vehicleNumber:e.target.value}))}/></Stack></DialogContent><DialogActions><Button onClick={()=>setNewWorker(false)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={!workerForm.workerId||!workerForm.fullName||!workerForm.password} onClick={()=>void createWorker()}>{l('Yaratish','Создать','Create')}</Button></DialogActions></Dialog>
  </>;
}

export function ReviewsPage(){
  const token=useToken(),l=useL(),enumLabel=useEnumLabel();
  const { confirm, confirmDialog }=useConfirm();
  const[tab,setTab]=useState(0),[search,setSearch]=useState(''),[active,setActive]=useState(''),[questionStatus,setQuestionStatus]=useState(''),[answering,setAnswering]=useState<Row|null>(null),[answer,setAnswer]=useState(''),[error,setError]=useState<string|null>(null);
  const reviewLoader=useCallback((p:number,s:number)=>api.listReviews(token,{page:p,page_size:s,search,active:active===''?undefined:active==='true'}),[token,search,active]);
  const questionLoader=useCallback((p:number,s:number)=>api.listQuestions(token,{page:p,page_size:s,search,status:questionStatus}),[token,search,questionStatus]);
  const reviews=usePaged(reviewLoader), questions=usePaged(questionLoader);
  const toggleReview=async(r:Row)=>{const hiding=Boolean(r.is_active);const ok=await confirm({danger:hiding,message:hiding?l('Ushbu sharhni yashirishga ishonchingiz komilmi?','Вы уверены, что хотите скрыть этот отзыв?','Are you sure you want to hide this review?'):l('Ushbu sharhni qayta ko‘rsatishga ishonchingiz komilmi?','Вы уверены, что хотите снова показать этот отзыв?','Are you sure you want to show this review again?')});if(!ok)return;try{await api.setReviewActive(token,r.id,!r.is_active);await reviews.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const toggleQuestion=async(r:Row)=>{const hiding=Boolean(r.is_active);const ok=await confirm({danger:hiding,message:hiding?l('Ushbu savolni yashirishga ishonchingiz komilmi?','Вы уверены, что хотите скрыть этот вопрос?','Are you sure you want to hide this question?'):l('Ushbu savolni qayta ko‘rsatishga ishonchingiz komilmi?','Вы уверены, что хотите снова показать этот вопрос?','Are you sure you want to show this question again?')});if(!ok)return;try{await api.setQuestionActive(token,r.id,!r.is_active);await questions.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const saveAnswer=async()=>{if(!answering||!answer.trim())return;try{await api.answerQuestion(token,answering.id,answer.trim());setAnswering(null);setAnswer('');await questions.reload()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  return <>
    <PageTitle title={l('Sharhlar va savollar','Отзывы и вопросы','Reviews & questions')} subtitle={l('Sharhlarni moderatsiya qiling va mahsulot savollariga javob bering.','Модерируйте отзывы и отвечайте на вопросы о товарах.','Moderate reviews and answer product questions.')}/>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Sharhlar','Отзывы','Reviews')}/><Tab label={l('Savollar','Вопросы','Questions')}/></Tabs>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} mb={3}><TextField size="small" label={l('Qidirish','Поиск','Search')} value={search} onChange={e=>setSearch(e.target.value)}/>{tab===0?<TextField select size="small" label={l('Holat','Статус','Status')} value={active} onChange={e=>setActive(e.target.value)} sx={{minWidth:160}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem><MenuItem value="true">{enumLabel('ACTIVE')}</MenuItem><MenuItem value="false">{enumLabel('HIDDEN')}</MenuItem></TextField>:<TextField select size="small" label={l('Holat','Статус','Status')} value={questionStatus} onChange={e=>setQuestionStatus(e.target.value)} sx={{minWidth:160}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem><MenuItem value="WAITING">{enumLabel('WAITING')}</MenuItem><MenuItem value="ANSWERED">{enumLabel('ANSWERED')}</MenuItem></TextField>}</Stack>
    {tab===0?<LoadState loading={reviews.loading} error={reviews.error} onRetry={reviews.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Baho','Оценка','Rating')}</TableCell><TableCell>{l('Sharh','Отзыв','Comment')}</TableCell><TableCell>{l('Vaqt','Время','Time')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{reviews.data.items.map(r=><TableRow key={r.id}><TableCell>{r.customer_name||r.phone_number}</TableCell><TableCell>{r.product_name}</TableCell><TableCell>{'★'.repeat(Math.max(0,Math.min(5,Number(r.rating||0))))}</TableCell><TableCell sx={{maxWidth:420}}>{r.comment||'-'}</TableCell><TableCell>{dateTime(r.created_at)}</TableCell><TableCell><StatusChip value={r.is_active?'ACTIVE':'HIDDEN'}/></TableCell><TableCell><Button size="small" onClick={()=>void toggleReview(r)}>{r.is_active?l('Yashirish','Скрыть','Hide'):l('Ko‘rsatish','Показать','Show')}</Button></TableCell></TableRow>)}</TableBody></Table>{reviews.pagination}</TablePanel></LoadState>:<LoadState loading={questions.loading} error={questions.error} onRetry={questions.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Savol','Вопрос','Question')}</TableCell><TableCell>{l('Javob','Ответ','Answer')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{questions.data.items.map(r=><TableRow key={r.id}><TableCell>{r.customer_name||r.phone_number||'-'}</TableCell><TableCell>{r.product_name||'-'}</TableCell><TableCell sx={{maxWidth:360}}>{r.question}</TableCell><TableCell sx={{maxWidth:360}}>{r.answer||'-'}</TableCell><TableCell><Stack direction="row" gap={.5}><StatusChip value={r.status}/>{!r.is_active&&<StatusChip value="HIDDEN"/>}</Stack></TableCell><TableCell><Stack direction="row" spacing={1}><Button size="small" onClick={()=>{setAnswering(r);setAnswer(r.answer||'')}}>{r.answer?l('Javobni tahrirlash','Изменить ответ','Edit answer'):l('Javob berish','Ответить','Answer')}</Button><Button size="small" color={r.is_active?'error':'success'} onClick={()=>void toggleQuestion(r)}>{r.is_active?l('Yashirish','Скрыть','Hide'):l('Ko‘rsatish','Показать','Show')}</Button></Stack></TableCell></TableRow>)}</TableBody></Table>{questions.pagination}</TablePanel></LoadState>}
    {confirmDialog}
    <Dialog open={!!answering} onClose={()=>setAnswering(null)} fullWidth maxWidth="sm"><DialogTitle>{l('Savolga javob','Ответ на вопрос','Answer question')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Typography fontWeight={700} mb={2}>{answering?.question}</Typography><TextField fullWidth multiline minRows={4} label={l('Javob','Ответ','Answer')} value={answer} onChange={e=>setAnswer(e.target.value)}/></DialogContent><DialogActions><Button onClick={()=>setAnswering(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={!answer.trim()} onClick={()=>void saveAnswer()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
  </>;
}

export function PromotionsPage(){
  const token=useToken(),l=useL(),enumLabel=useEnumLabel();
  const { confirm, confirmDialog }=useConfirm();
  const[tab,setTab]=useState(0),[promos,setPromos]=useState<Row[]>([]),[banners,setBanners]=useState<Row[]>([]),[coupons,setCoupons]=useState<Row[]>([]),[products,setProducts]=useState<Row[]>([]),[edit,setEdit]=useState<Row|null>(null),[editCoupon,setEditCoupon]=useState<Row|null>(null),[bannerIds,setBannerIds]=useState<number[]>([]),[error,setError]=useState<string|null>(null);
  const load=useCallback(async()=>{try{const[p,b,c,pr]=await Promise.all([api.listPromotions(token),api.listBanners(token),api.listCoupons(token),api.listProducts(token,{page:1,page_size:100,active:true})]);setPromos(p);setBanners(b);setCoupons(c);setProducts(pr.items);setBannerIds(b.map(x=>Number(x.product_id)));setError(null);}catch(e){setError(e instanceof Error?e.message:'Error')}},[token]);useEffect(()=>{void load()},[load]);
  const savePromo=async()=>{if(!edit)return;if(edit.promotion_id&&edit.use_yn==='N'){const ok=await confirm({danger:true,message:l('Ushbu aksiyani faol emas holatda saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить эту акцию неактивной?','Are you sure you want to save this promotion as inactive?')});if(!ok)return;}try{if(edit.promotion_id)await api.updatePromotion(token,edit.promotion_id,edit);else await api.createPromotion(token,edit);setEdit(null);await load()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const saveBanners=async()=>{const ok=await confirm({message:l('Bosh sahifa bannerlarini yangilashga ishonchingiz komilmi?','Вы уверены, что хотите обновить баннеры главной страницы?','Are you sure you want to update the home page banners?')});if(!ok)return;try{await api.replaceBanners(token,bannerIds.map((id,i)=>({product_id:id,sort_order:i+1})));await load()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const blankCoupon=()=>({coupon_id:0,coupon_name:'',coupon_type:'AMOUNT',discount_amount:0,discount_rate:0,start_date:'',end_date:'',use_yn:'Y'});
  const saveCoupon=async()=>{if(!editCoupon)return;if(editCoupon.coupon_id&&editCoupon.use_yn==='N'){const ok=await confirm({danger:true,message:l('Ushbu kuponni faol emas holatda saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить этот купон неактивным?','Are you sure you want to save this coupon as inactive?')});if(!ok)return;}try{if(editCoupon.coupon_id)await api.updateCoupon(token,editCoupon.coupon_id,editCoupon);else await api.createCoupon(token,editCoupon);setEditCoupon(null);await load()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const actionLabel=tab===0?l('Aksiya qo‘shish','Добавить акцию','Add promotion'):tab===2?l('Kupon qo‘shish','Добавить купон','Add coupon'):undefined;
  const action=tab===0?()=>setEdit({promotion_id:0,title:'',content:'',image_url:'',start_date:'',end_date:'',use_yn:'Y'}):tab===2?()=>setEditCoupon(blankCoupon()):undefined;
  return <>
    <PageTitle title={l('Marketing','Маркетинг','Marketing')} subtitle={l('Aksiyalar, bosh sahifa bannerlari va kuponlarni boshqaring.','Управляйте акциями, баннерами и купонами.','Manage promotions, home banners and coupons.')} actionLabel={actionLabel} onAction={action}/>
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Aksiyalar','Акции','Promotions')}/><Tab label={l('Bannerlar','Баннеры','Banners')}/><Tab label={l('Kuponlar','Купоны','Coupons')}/></Tabs>
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    {tab===0&&<TablePanel><Table><TableHead><TableRow><TableCell>{l('Nomi','Название','Title')}</TableCell><TableCell>{l('Boshlanish','Начало','Start')}</TableCell><TableCell>{l('Tugash','Конец','End')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{promos.map(r=><TableRow key={r.promotion_id}><TableCell>{r.title}</TableCell><TableCell>{dateTime(r.start_date)}</TableCell><TableCell>{dateTime(r.end_date)}</TableCell><TableCell><StatusChip value={r.use_yn==='Y'?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><IconButton onClick={()=>setEdit({...r})}><EditRounded/></IconButton></TableCell></TableRow>)}</TableBody></Table></TablePanel>}
    {tab===1&&<Panel sx={{p:3}}><Typography fontWeight={800} mb={.5}>{l('Bosh sahifada ko‘rsatiladigan mahsulotlar','Товары для главного баннера','Products shown in home banner')}</Typography><Typography color="text.secondary" mb={2}>{l('Belgilash tartibi banner tartibiga aylanadi.','Порядок выбора становится порядком баннеров.','Selected products are saved as banner items.')}</Typography><Stack gap={1}>{products.map(p=><FormControlLabel key={p.id} control={<Checkbox checked={bannerIds.includes(Number(p.id))} onChange={e=>setBannerIds(ids=>e.target.checked?[...ids,Number(p.id)]:ids.filter(id=>id!==Number(p.id)))}/>} label={<Stack direction="row" alignItems="center" gap={1}><Avatar variant="rounded" src={api.imageUrl(p.image_url)} sx={{width:38,height:38}}/><span>{p.name} · {money(p.price)}</span></Stack>}/>)}</Stack><Button variant="contained" sx={{mt:2}} onClick={()=>void saveBanners()}>{l('Bannerlarni saqlash','Сохранить баннеры','Save banners')}</Button></Panel>}
    {tab===2&&<TablePanel><Table><TableHead><TableRow><TableCell>{l('Nomi','Название','Name')}</TableCell><TableCell>{l('Turi','Тип','Type')}</TableCell><TableCell>{l('Chegirma','Скидка','Discount')}</TableCell><TableCell>{l('Muddat','Период','Period')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{coupons.map(c=><TableRow key={c.coupon_id}><TableCell>{c.coupon_name}</TableCell><TableCell>{enumLabel(c.coupon_type)}</TableCell><TableCell>{c.coupon_type==='RATE'?`${c.discount_rate||0}%`:money(c.discount_amount)}</TableCell><TableCell>{String(c.start_date||'').slice(0,10)} — {String(c.end_date||'').slice(0,10)}</TableCell><TableCell><StatusChip value={c.use_yn==='Y'?'ACTIVE':'INACTIVE'}/></TableCell><TableCell><IconButton onClick={()=>setEditCoupon({...c})}><EditRounded/></IconButton></TableCell></TableRow>)}</TableBody></Table></TablePanel>}
    {confirmDialog}
    <Dialog open={!!edit} onClose={()=>setEdit(null)} fullWidth maxWidth="sm"><DialogTitle>{edit?.promotion_id?l('Aksiyani tahrirlash','Редактировать акцию','Edit promotion'):l('Yangi aksiya','Новая акция','New promotion')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Nomi','Название','Title')} value={edit?.title||''} onChange={e=>setEdit(v=>v&&({...v,title:e.target.value}))}/><TextField multiline label={l('Tavsif','Описание','Content')} value={edit?.content||''} onChange={e=>setEdit(v=>v&&({...v,content:e.target.value}))}/><TextField label={l('Rasm URL','URL изображения','Image URL')} value={edit?.image_url||''} onChange={e=>setEdit(v=>v&&({...v,image_url:e.target.value}))}/><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}><TextField fullWidth type="date" InputLabelProps={{shrink:true}} label={l('Boshlanish','Начало','Start')} value={String(edit?.start_date||'').slice(0,10)} onChange={e=>setEdit(v=>v&&({...v,start_date:e.target.value}))}/><TextField fullWidth type="date" InputLabelProps={{shrink:true}} label={l('Tugash','Конец','End')} value={String(edit?.end_date||'').slice(0,10)} onChange={e=>setEdit(v=>v&&({...v,end_date:e.target.value}))}/></Stack><FormControlLabel control={<Checkbox checked={edit?.use_yn!=='N'} onChange={e=>setEdit(v=>v&&({...v,use_yn:e.target.checked?'Y':'N'}))}/>} label={l('Faol','Активна','Active')}/></Stack></DialogContent><DialogActions><Button onClick={()=>setEdit(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" onClick={()=>void savePromo()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
    <Dialog open={!!editCoupon} onClose={()=>setEditCoupon(null)} fullWidth maxWidth="sm"><DialogTitle>{editCoupon?.coupon_id?l('Kuponni tahrirlash','Редактировать купон','Edit coupon'):l('Yangi kupon','Новый купон','New coupon')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Nomi','Название','Name')} value={editCoupon?.coupon_name||''} onChange={e=>setEditCoupon(v=>v&&({...v,coupon_name:e.target.value}))}/><TextField select label={l('Chegirma turi','Тип скидки','Discount type')} value={editCoupon?.coupon_type||'AMOUNT'} onChange={e=>setEditCoupon(v=>v&&({...v,coupon_type:e.target.value}))}><MenuItem value="AMOUNT">{enumLabel('AMOUNT')}</MenuItem><MenuItem value="RATE">{enumLabel('RATE')}</MenuItem></TextField>{editCoupon?.coupon_type==='RATE'?<TextField type="number" label={l('Foiz','Процент','Percent')} value={editCoupon?.discount_rate??0} onChange={e=>setEditCoupon(v=>v&&({...v,discount_rate:Number(e.target.value)}))}/>:<TextField type="number" label={l('Chegirma summasi','Сумма скидки','Discount amount')} value={editCoupon?.discount_amount??0} onChange={e=>setEditCoupon(v=>v&&({...v,discount_amount:Number(e.target.value)}))}/>}<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}><TextField fullWidth type="date" InputLabelProps={{shrink:true}} label={l('Boshlanish','Начало','Start')} value={String(editCoupon?.start_date||'').slice(0,10)} onChange={e=>setEditCoupon(v=>v&&({...v,start_date:e.target.value}))}/><TextField fullWidth type="date" InputLabelProps={{shrink:true}} label={l('Tugash','Конец','End')} value={String(editCoupon?.end_date||'').slice(0,10)} onChange={e=>setEditCoupon(v=>v&&({...v,end_date:e.target.value}))}/></Stack><FormControlLabel control={<Checkbox checked={editCoupon?.use_yn!=='N'} onChange={e=>setEditCoupon(v=>v&&({...v,use_yn:e.target.checked?'Y':'N'}))}/>} label={l('Faol','Активен','Active')}/></Stack></DialogContent><DialogActions><Button onClick={()=>setEditCoupon(null)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={!editCoupon?.coupon_name||!editCoupon?.start_date||!editCoupon?.end_date} onClick={()=>void saveCoupon()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>
  </>;
}

export function SettingsPage(){
 const token=useToken(),l=useL(),enumLabel=useEnumLabel();const{confirm,confirmDialog}=useConfirm();const[tab,setTab]=useState(0),[settings,setSettings]=useState<Row>({}),[admins,setAdmins]=useState<Row[]>([]),[newAdmin,setNewAdmin]=useState(false),[adminForm,setAdminForm]=useState({login_id:'',password:'',name:''}),[message,setMessage]=useState('');
 const load=useCallback(async()=>{const[s,a]=await Promise.all([api.getSettings(token),api.listAdmins(token)]);setSettings(s||{});setAdmins(a)},[token]);useEffect(()=>{void load()},[load]);
 const saveSettings=async()=>{const ok=await confirm({message:l('Tizim sozlamalarini saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить системные настройки?','Are you sure you want to save the system settings?')});if(!ok)return;await api.updateSettings(token,settings);setMessage(l('Saqlandi','Сохранено','Saved'));};const toggleAdmin=async(a:Row)=>{const disabling=a.status==='ACTIVE';const ok=await confirm({danger:disabling,message:disabling?l('Ushbu administrator hisobini o‘chirishga ishonchingiz komilmi?','Вы уверены, что хотите отключить эту учётную запись администратора?','Are you sure you want to disable this administrator account?'):l('Ushbu administrator hisobini faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите активировать эту учётную запись администратора?','Are you sure you want to enable this administrator account?')});if(!ok)return;await api.setAdminStatus(token,a.id,disabling?'INACTIVE':'ACTIVE');await load()};const createAdmin=async()=>{await api.registerAdmin(token,adminForm);setNewAdmin(false);setAdminForm({login_id:'',password:'',name:''});await load()};
 return <><PageTitle title={l('Sozlamalar','Настройки','Settings')} subtitle={l('Ilova va administrator hisoblarini boshqaring.','Управляйте приложением и администраторами.','Manage app configuration and administrator accounts.')}/>{message&&<Alert severity="success" sx={{mb:2}} onClose={()=>setMessage('')}>{message}</Alert>}<Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Ilova','Приложение','Application')}/><Tab label={l('Administratorlar','Администраторы','Administrators')}/></Tabs>{tab===0?<Panel sx={{p:3,maxWidth:760}}><Stack spacing={3}><TextField label={l('Ilova versiyasi','Версия приложения','App version')} value={settings.app_version||''} onChange={e=>setSettings(v=>({...v,app_version:e.target.value}))}/><FormControlLabel control={<Checkbox checked={settings.force_update_yn==='Y'} onChange={e=>setSettings(v=>({...v,force_update_yn:e.target.checked?'Y':'N'}))}/>} label={l('Majburiy yangilash','Принудительное обновление','Force update')}/><FormControlLabel control={<Checkbox checked={settings.maintenance_yn==='Y'} onChange={e=>setSettings(v=>({...v,maintenance_yn:e.target.checked?'Y':'N'}))}/>} label={l('Texnik xizmat rejimi','Режим обслуживания','Maintenance mode')}/><TextField multiline label={l('Texnik xabar','Сообщение обслуживания','Maintenance message')} value={settings.maintenance_message||''} onChange={e=>setSettings(v=>({...v,maintenance_message:e.target.value}))}/><TextField label="Terms URL" value={settings.terms_url||''} onChange={e=>setSettings(v=>({...v,terms_url:e.target.value}))}/><TextField label="Privacy URL" value={settings.privacy_url||''} onChange={e=>setSettings(v=>({...v,privacy_url:e.target.value}))}/><Button variant="contained" onClick={()=>void saveSettings()} sx={{alignSelf:'flex-start'}}>{l('Saqlash','Сохранить','Save')}</Button></Stack></Panel>:<><Button variant="contained" sx={{mb:2}} onClick={()=>setNewAdmin(true)}>{l('Admin qo‘shish','Добавить админа','Add admin')}</Button><TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Ism','Имя','Name')}</TableCell><TableCell>Login</TableCell><TableCell>{l('Rol','Роль','Role')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{admins.map(a=><TableRow key={a.id}><TableCell>{a.id}</TableCell><TableCell>{a.name}</TableCell><TableCell>{a.login_id}</TableCell><TableCell>{enumLabel(a.role)}</TableCell><TableCell><StatusChip value={a.status}/></TableCell><TableCell><Button size="small" onClick={()=>void toggleAdmin(a)}>{a.status==='ACTIVE'?l('O‘chirish','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button></TableCell></TableRow>)}</TableBody></Table></TablePanel></>}{confirmDialog}<Dialog open={newAdmin} onClose={()=>setNewAdmin(false)} fullWidth maxWidth="xs"><DialogTitle>{l('Yangi administrator','Новый администратор','New administrator')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Ism','Имя','Name')} value={adminForm.name} onChange={e=>setAdminForm(v=>({...v,name:e.target.value}))}/><TextField label="Login" value={adminForm.login_id} onChange={e=>setAdminForm(v=>({...v,login_id:e.target.value}))}/><TextField type="password" label={l('Parol','Пароль','Password')} value={adminForm.password} onChange={e=>setAdminForm(v=>({...v,password:e.target.value}))}/></Stack></DialogContent><DialogActions><Button onClick={()=>setNewAdmin(false)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" onClick={()=>void createAdmin()}>{l('Yaratish','Создать','Create')}</Button></DialogActions></Dialog></>;
}
