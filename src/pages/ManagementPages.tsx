import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import { Alert, Autocomplete, Avatar, Backdrop, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
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
const MXIK_PAGE_SIZE = 20;
function usePaged(loader:(page:number,pageSize:number)=>Promise<api.PageData>) {
  const l=useL();
  const [data,setData]=useState(emptyPage), [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null);
  const [page,setPage]=useState(0), [pageSize,setPageSize]=useState(20);
  const reload=useCallback(async()=>{setLoading(true);setError(null);try{setData(await loader(page+1,pageSize));}catch(e){setError(e instanceof Error?e.message:'Error');}finally{setLoading(false);}},[loader,page,pageSize]);
  useEffect(()=>{void reload();},[reload]);
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
      short_description: selected?.package_name ?? '',
      description: createMxik?.mxik_name ?? '',
    }));
  };

  const selectEditPackage = (packageId: string | number) => {
    const selected = editPackages.find((item) => Number(item.fiscal_mxik_package_id) === Number(packageId));
    setEdit((value) => value && ({
      ...value,
      fiscal_mxik_package_id: Number(packageId),
      short_description: selected?.package_name ?? '',
      description: editMxik?.mxik_name ?? '',
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
      };

      const changedFields: Row = {};
      Object.entries(currentValues).forEach(([key, value]) => {
        if (!sameEditValue(key, value, editOriginal[key])) changedFields[key] = value;
      });

      if (Object.keys(changedFields).length > 0) {
        await api.updateProduct(token, edit.id, changedFields);
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
        category_id: Number(form.category_id),
        fiscal_mxik_package_id: Number(form.fiscal_mxik_package_id),
        vat_percent: Number(form.vat_percent),
        name: String(form.name).trim(),
        sku: String(form.sku ?? '').trim() || null,
        barcode: String(form.barcode ?? '').trim() || null,
        brand: String(form.brand ?? '').trim() || null,
        price: Number(form.price),
        subscription_price: form.subscription_price === '' ? null : Number(form.subscription_price),
        stock_quantity: Number(form.stock_quantity),
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
      message: l(
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
      onAction={() => { setForm(blankProduct()); setImages([]); setCreateMxik(null); setCreatePackages([]); setMxikKeyword(''); setCreateError(null); setCreateSaving(false); setCreateOpen(true); }}
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
          <TableCell>{row.category_name || '-'}</TableCell><TableCell>{money(row.price)}</TableCell><TableCell>{row.subscription_price == null ? '-' : money(row.subscription_price)}</TableCell><TableCell>{row.stock_quantity}</TableCell>
          <TableCell>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch size="small" checked={Boolean(row.is_active)} disabled={productActionId === Number(row.id)} onChange={() => void toggleProductActive(row)} />
              {productActionId === Number(row.id)
                ? <CircularProgress size={18} thickness={5} />
                : <Typography variant="body2" fontWeight={700}>{enumLabel(row.is_active ? 'ACTIVE' : 'INACTIVE')}</Typography>}
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
        {editField('stock_quantity', l('Ombor', 'Остаток', 'Stock'), 'number')}{editField('vat_percent', 'VAT %', 'number')}
        {editField('sku', 'SKU')}{editField('barcode', l('Shtrix kod', 'Штрихкод', 'Barcode'))}{editField('weight_gram', l('Og‘irlik (g)', 'Вес (г)', 'Weight (g)'), 'number')}
        <Box sx={{ gridColumn: '1 / -1' }}><FormControlLabel control={<Checkbox checked={Boolean(edit?.is_active)} onChange={(event) => setEdit((value) => value && ({ ...value, is_active: event.target.checked }))} />} label={l('Faol', 'Активный', 'Active')} /></Box>
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Qisqa tavsif', 'Краткое описание', 'Short description')} value={edit?.short_description ?? ''} multiline minRows={2} InputProps={{ readOnly: true }} helperText={l('Tanlangan qadoq / o‘lchovdan avtomatik olinadi', 'Автоматически берётся из выбранной упаковки / единицы', 'Filled automatically from the selected package / unit')} />
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Tavsif', 'Описание', 'Description')} value={edit?.description ?? ''} multiline minRows={2} InputProps={{ readOnly: true }} helperText={l('Tanlangan Fiscal MXIK nomidan avtomatik olinadi', 'Автоматически берётся из названия Fiscal MXIK', 'Filled automatically from the selected Fiscal MXIK name')} />
        <Box gridColumn={{ md: '1 / -1' }} sx={{ mt: 1 }}>
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
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={52} />
          <Typography fontWeight={800}>{l('Saqlanmoqda...', 'Сохранение...', 'Saving...')}</Typography>
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
        {formField('stock_quantity', l('Ombor', 'Остаток', 'Stock'), 'number')}{formField('vat_percent', 'VAT %', 'number')}
        {formField('sku', 'SKU')}{formField('barcode', l('Shtrix kod', 'Штрихкод', 'Barcode'))}{formField('weight_gram', l('Og‘irlik (g)', 'Вес (г)', 'Weight (g)'), 'number')}
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Qisqa tavsif', 'Краткое описание', 'Short description')} value={form.short_description} multiline minRows={2} InputProps={{ readOnly: true }} helperText={l('Tanlangan qadoq / o‘lchovdan avtomatik olinadi', 'Автоматически берётся из выбранной упаковки / единицы', 'Filled automatically from the selected package / unit')} />
        <TextField sx={{ gridColumn: '1 / -1' }} label={l('Tavsif', 'Описание', 'Description')} value={form.description} multiline minRows={2} InputProps={{ readOnly: true }} helperText={l('Tanlangan Fiscal MXIK nomidan avtomatik olinadi', 'Автоматически берётся из названия Fiscal MXIK', 'Filled automatically from the selected Fiscal MXIK name')} />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Button component="label" variant="outlined">
            {l('Rasmlarni tanlash', 'Выбрать изображения', 'Choose images')}
            <input hidden multiple type="file" accept="image/*" onChange={(event) => setImages(Array.from(event.target.files || []))} />
          </Button>
          {images.length > 0 && <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, mb: 1.25 }}>
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
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={52} />
          <Typography fontWeight={800}>{l('Saqlanmoqda...', 'Сохранение...', 'Saving...')}</Typography>
        </Stack>
      </Backdrop>
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
  const workerStatus=async(r:Row)=>{const disabling=r.status==='ACTIVE';const ok=await confirm({danger:disabling,message:disabling?l('Ushbu kuryerni nofaol qilishga ishonchingiz komilmi?','Вы уверены, что хотите сделать этого курьера неактивным?','Are you sure you want to make this courier inactive?'):l('Ushbu kuryerni faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите активировать этого курьера?','Are you sure you want to enable this courier?')});if(!ok)return;try{await api.setDeliveryWorkerStatus(token,r.id,disabling?'INACTIVE':'ACTIVE');await loadWorkers()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  const deleteWorker=async(r:Row)=>{const ok=await confirm({danger:true,message:l(`${r.full_name||r.worker_code} kuryerini butunlay o‘chirishga ishonchingiz komilmi? Bu amalni qaytarib bo‘lmaydi.`,`Вы уверены, что хотите навсегда удалить курьера ${r.full_name||r.worker_code}? Это действие нельзя отменить.`,`Are you sure you want to permanently delete courier ${r.full_name||r.worker_code}? This action cannot be undone.`)});if(!ok)return;try{await api.deleteDeliveryWorker(token,r.id);setWorkers(current=>current.filter(w=>Number(w.id)!==Number(r.id)));setError(null)}catch(e){const message=e instanceof Error?e.message:'Error';setError(message==='COURIER_IS_IN_USE'?l('Bu kuryer yetkazib berish tarixida ishlatilgan. Tarixni saqlash uchun uni butunlay o‘chirib bo‘lmaydi. Uni Nofaol holatda qoldiring.','Этот курьер уже используется в истории доставок. Для сохранения истории его нельзя удалить полностью. Оставьте его неактивным.','This courier is already used in delivery history and cannot be permanently deleted. Keep the courier inactive instead.'):message)}};
  const createWorker=async()=>{try{await api.createDeliveryWorker(token,workerForm);setNewWorker(false);setWorkerForm({workerId:'',fullName:'',phoneNumber:'',password:'',vehicleType:'',vehicleNumber:''});await loadWorkers()}catch(e){setError(e instanceof Error?e.message:'Error')}};
  return <>
    <PageTitle title={l('Yetkazib berish','Доставка','Delivery')} subtitle={l('Kuryerlar va yetkazma ishlarini boshqaring.','Управляйте курьерами и доставками.','Manage couriers and delivery jobs.')} actionLabel={tab===1?l('Kuryer qo‘shish','Добавить курьера','Add courier'):undefined} onAction={tab===1?()=>setNewWorker(true):undefined}/>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Yetkazmalar','Доставки','Jobs')}/><Tab label={l('Kuryerlar','Курьеры','Couriers')}/></Tabs>
    {tab===0?<><TextField select size="small" label={l('Holat','Статус','Status')} value={status} onChange={e=>setStatus(e.target.value)} sx={{minWidth:200,mb:2}}><MenuItem value="">{l('Barchasi','Все','All')}</MenuItem>{['WAITING_ASSIGNMENT','ACCEPTED','ON_THE_WAY','DELIVERED','FAILED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</TextField><LoadState loading={x.loading} error={x.error} onRetry={x.reload}><TablePanel><Table><TableHead><TableRow><TableCell>{l('Buyurtma','Заказ','Order')}</TableCell><TableCell>{l('Mijoz','Клиент','Customer')}</TableCell><TableCell>{l('Kuryer','Курьер','Courier')}</TableCell><TableCell>{l('Manzil','Адрес','Address')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell>{l('Yangilangan','Обновлено','Updated')}</TableCell></TableRow></TableHead><TableBody>{x.data.items.map(r=><TableRow key={r.id}><TableCell>{r.order_number}</TableCell><TableCell>{r.customer_name}</TableCell><TableCell><Select size="small" displayEmpty value={r.delivery_worker_id||''} onChange={e=>void updateJob(r,{delivery_worker_id:Number(e.target.value),status:r.status==='WAITING_ASSIGNMENT'?'ACCEPTED':r.status})}><MenuItem value="">-</MenuItem>{workers.filter(w=>w.status==='ACTIVE').map(w=><MenuItem key={w.id} value={w.id}>{w.full_name}</MenuItem>)}</Select></TableCell><TableCell sx={{maxWidth:260}}>{r.delivery_address}</TableCell><TableCell><Select size="small" value={r.status} onChange={e=>void updateJob(r,{status:e.target.value})}>{['WAITING_ASSIGNMENT','ACCEPTED','ON_THE_WAY','DELIVERED','FAILED','CANCELLED'].map(v=><MenuItem key={v} value={v}>{enumLabel(v)}</MenuItem>)}</Select></TableCell><TableCell>{dateTime(r.updated_at)}</TableCell></TableRow>)}</TableBody></Table>{x.pagination}</TablePanel></LoadState></>:<TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Kuryer','Курьер','Courier')}</TableCell><TableCell>{l('Telefon','Телефон','Phone')}</TableCell><TableCell>{l('Transport','Транспорт','Vehicle')}</TableCell><TableCell>{l('Onlayn','Онлайн','Online')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{workers.map(w=><TableRow key={w.id}><TableCell>{w.worker_code}</TableCell><TableCell>{w.full_name}</TableCell><TableCell>{w.phone_number}</TableCell><TableCell>{[w.vehicle_type,w.vehicle_number].filter(Boolean).join(' · ')}</TableCell><TableCell><StatusChip value={w.is_online?'ONLINE':'OFFLINE'}/></TableCell><TableCell><StatusChip value={w.status}/></TableCell><TableCell><Stack direction="row" spacing={1} alignItems="center"><Button size="small" color={w.status==='ACTIVE'?'warning':'success'} onClick={()=>void workerStatus(w)}>{w.status==='ACTIVE'?l('Nofaol qilish','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button><Tooltip title={l('Kuryerni o‘chirish','Удалить курьера','Delete courier')}><IconButton color="error" size="small" onClick={()=>void deleteWorker(w)}><DeleteRounded/></IconButton></Tooltip></Stack></TableCell></TableRow>)}</TableBody></Table></TablePanel>}
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
          <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{xs:'stretch',sm:'center'}} spacing={3}>
            <Box>
              <Stack direction="row" alignItems="baseline" spacing={1.5} flexWrap="wrap">
                <Typography fontWeight={850} fontSize={20}>{l('Bosh sahifa banneri','Баннер главной страницы','Home page banner')}</Typography>
                <Typography color="text.secondary" fontWeight={700}>{banners.length} {l('ta mahsulot','товаров','products')}</Typography>
              </Stack>
              <Typography color="text.secondary" mt={0.75}>{l('Quyidagi mahsulotlar mobil ilovaning bosh sahifasida banner sifatida ko‘rsatiladi.','Эти товары отображаются в баннере на главной странице мобильного приложения.','These products are displayed in the mobile app home-page banner.')}</Typography>
            </Box>
            <Button variant="contained" startIcon={<AddRounded/>} onClick={openAdd} disabled={saving||addableProducts.length===0} sx={{flexShrink:0,alignSelf:{xs:'stretch',sm:'center'}}}>
              {l('Mahsulotlar qo‘shish','Добавить товары','Add products')}
            </Button>
          </Stack>
        </Box>

        <Box sx={{borderTop:'1px solid',borderColor:'divider'}}>
          {banners.length===0
            ?<Box sx={{py:8,px:3,textAlign:'center'}}>
              <Typography fontWeight={800} fontSize={18}>{l('Banner hozircha bo‘sh','Баннер пока пуст','The banner is empty')}</Typography>
              <Typography color="text.secondary" mt={1}>{l('Yuqoridagi “Mahsulotlar qo‘shish” tugmasi orqali bir yoki bir nechta mahsulot tanlang.','Используйте кнопку «Добавить товары» выше, чтобы выбрать один или несколько товаров.','Use the “Add products” button above to select one or more products.')}</Typography>
            </Box>
            :<Box sx={{overflowX:'auto'}}><Table>
              <TableHead><TableRow><TableCell width={70}>#</TableCell><TableCell>{l('Mahsulot','Товар','Product')}</TableCell><TableCell>{l('Narx','Цена','Price')}</TableCell><TableCell width={110}>{l('Tartib','Порядок','Order')}</TableCell><TableCell align="right" width={230}>{l('Amallar','Действия','Actions')}</TableCell></TableRow></TableHead>
              <TableBody>{banners.map((banner,index)=><TableRow key={banner.id??`${banner.product_id}-${index}`} hover onClick={()=>openEdit(index)} sx={{cursor:'pointer'}}>
                <TableCell>{index+1}</TableCell>
                <TableCell><Stack direction="row" alignItems="center" sx={{columnGap:2.5}}>
                  <Avatar variant="rounded" src={api.imageUrl(banner.image_url)} sx={{width:62,height:62,bgcolor:'grey.100',flexShrink:0}}/>
                  <Box><Typography fontWeight={750}>{banner.product_name||'-'}</Typography><Typography variant="body2" color="text.secondary">ID: {banner.product_id}</Typography></Box>
                </Stack></TableCell>
                <TableCell>{money(products.find(product=>Number(product.id)===Number(banner.product_id))?.price)}</TableCell>
                <TableCell>{index+1}</TableCell>
                <TableCell align="right" onClick={event=>event.stopPropagation()}>
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
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
              <Box><Typography>{product.name}</Typography><Typography variant="caption" color="text.secondary">{money(product.price)}</Typography></Box>
            </li>}
            renderInput={params=><TextField {...params} label={l('Mahsulotlarni tanlang','Выберите товары','Select products')} placeholder={l('Qidirish...','Поиск...','Search...')}/>}
          />
          {selectedProducts.length>0&&<Box mt={3}>
            <Typography fontWeight={800} mb={1.5}>{selectedProducts.length} {l('ta mahsulot tanlandi','товаров выбрано','products selected')}</Typography>
            <Stack spacing={1.25}>{selectedProducts.map(product=><Box key={product.id} sx={{display:'flex',alignItems:'center',p:1.25,border:'1px solid',borderColor:'divider',borderRadius:2}}>
              <Avatar variant="rounded" src={api.imageUrl(product.image_url)} sx={{width:52,height:52,bgcolor:'grey.100',mr:2,flexShrink:0}}/>
              <Box sx={{minWidth:0,flex:1}}><Typography fontWeight={750} noWrap>{product.name}</Typography><Typography variant="body2" color="text.secondary">{money(product.price)}</Typography></Box>
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
              <Box><Typography>{product.name}</Typography><Typography variant="caption" color="text.secondary">{money(product.price)}</Typography></Box>
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

    <Backdrop open={saving} sx={{zIndex:theme=>theme.zIndex.modal+20,color:'#fff'}}><Stack alignItems="center" spacing={2}><CircularProgress color="inherit"/><Typography fontWeight={800}>{l('Saqlanmoqda...','Сохранение...','Saving...')}</Typography></Stack></Backdrop>
  </>;
}

export function SettingsPage(){
 const token=useToken(),l=useL(),enumLabel=useEnumLabel();const{confirm,confirmDialog}=useConfirm();const[tab,setTab]=useState(0),[settings,setSettings]=useState<Row>({}),[admins,setAdmins]=useState<Row[]>([]),[newAdmin,setNewAdmin]=useState(false),[adminForm,setAdminForm]=useState({login_id:'',password:'',name:''}),[message,setMessage]=useState('');
 const load=useCallback(async()=>{const[s,a]=await Promise.all([api.getSettings(token),api.listAdmins(token)]);setSettings(s||{});setAdmins(a)},[token]);useEffect(()=>{void load()},[load]);
 const saveSettings=async()=>{const ok=await confirm({message:l('Tizim sozlamalarini saqlashga ishonchingiz komilmi?','Вы уверены, что хотите сохранить системные настройки?','Are you sure you want to save the system settings?')});if(!ok)return;await api.updateSettings(token,settings);setMessage(l('Saqlandi','Сохранено','Saved'));};const toggleAdmin=async(a:Row)=>{const disabling=a.status==='ACTIVE';const ok=await confirm({danger:disabling,message:disabling?l('Ushbu administrator hisobini o‘chirishga ishonchingiz komilmi?','Вы уверены, что хотите отключить эту учётную запись администратора?','Are you sure you want to disable this administrator account?'):l('Ushbu administrator hisobini faollashtirishga ishonchingiz komilmi?','Вы уверены, что хотите активировать эту учётную запись администратора?','Are you sure you want to enable this administrator account?')});if(!ok)return;await api.setAdminStatus(token,a.id,disabling?'INACTIVE':'ACTIVE');await load()};const createAdmin=async()=>{await api.registerAdmin(token,adminForm);setNewAdmin(false);setAdminForm({login_id:'',password:'',name:''});await load()};
 return <><PageTitle title={l('Sozlamalar','Настройки','Settings')} subtitle={l('Ilova va administrator hisoblarini boshqaring.','Управляйте приложением и администраторами.','Manage app configuration and administrator accounts.')}/>{message&&<Alert severity="success" sx={{mb:2}} onClose={()=>setMessage('')}>{message}</Alert>}<Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:3}}><Tab label={l('Ilova','Приложение','Application')}/><Tab label={l('Administratorlar','Администраторы','Administrators')}/></Tabs>{tab===0?<Panel sx={{p:3,maxWidth:760}}><Stack spacing={3}><TextField label={l('Ilova versiyasi','Версия приложения','App version')} value={settings.app_version||''} onChange={e=>setSettings(v=>({...v,app_version:e.target.value}))}/><FormControlLabel control={<Checkbox checked={settings.force_update_yn==='Y'} onChange={e=>setSettings(v=>({...v,force_update_yn:e.target.checked?'Y':'N'}))}/>} label={l('Majburiy yangilash','Принудительное обновление','Force update')}/><FormControlLabel control={<Checkbox checked={settings.maintenance_yn==='Y'} onChange={e=>setSettings(v=>({...v,maintenance_yn:e.target.checked?'Y':'N'}))}/>} label={l('Texnik xizmat rejimi','Режим обслуживания','Maintenance mode')}/><TextField multiline label={l('Texnik xabar','Сообщение обслуживания','Maintenance message')} value={settings.maintenance_message||''} onChange={e=>setSettings(v=>({...v,maintenance_message:e.target.value}))}/><TextField label="Terms URL" value={settings.terms_url||''} onChange={e=>setSettings(v=>({...v,terms_url:e.target.value}))}/><TextField label="Privacy URL" value={settings.privacy_url||''} onChange={e=>setSettings(v=>({...v,privacy_url:e.target.value}))}/><Button variant="contained" onClick={()=>void saveSettings()} sx={{alignSelf:'flex-start'}}>{l('Saqlash','Сохранить','Save')}</Button></Stack></Panel>:<><Button variant="contained" sx={{mb:2}} onClick={()=>setNewAdmin(true)}>{l('Admin qo‘shish','Добавить админа','Add admin')}</Button><TablePanel><Table><TableHead><TableRow><TableCell>ID</TableCell><TableCell>{l('Ism','Имя','Name')}</TableCell><TableCell>Login</TableCell><TableCell>{l('Rol','Роль','Role')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell><TableCell/></TableRow></TableHead><TableBody>{admins.map(a=><TableRow key={a.id}><TableCell>{a.id}</TableCell><TableCell>{a.name}</TableCell><TableCell>{a.login_id}</TableCell><TableCell>{enumLabel(a.role)}</TableCell><TableCell><StatusChip value={a.status}/></TableCell><TableCell><Button size="small" onClick={()=>void toggleAdmin(a)}>{a.status==='ACTIVE'?l('O‘chirish','Отключить','Disable'):l('Faollashtirish','Включить','Enable')}</Button></TableCell></TableRow>)}</TableBody></Table></TablePanel></>}{confirmDialog}<Dialog open={newAdmin} onClose={()=>setNewAdmin(false)} fullWidth maxWidth="xs"><DialogTitle>{l('Yangi administrator','Новый администратор','New administrator')}</DialogTitle><DialogContent sx={{pt:'20px!important'}}><Stack spacing={3}><TextField label={l('Ism','Имя','Name')} value={adminForm.name} onChange={e=>setAdminForm(v=>({...v,name:e.target.value}))}/><TextField label="Login" value={adminForm.login_id} onChange={e=>setAdminForm(v=>({...v,login_id:e.target.value}))}/><TextField type="password" label={l('Parol','Пароль','Password')} value={adminForm.password} onChange={e=>setAdminForm(v=>({...v,password:e.target.value}))}/></Stack></DialogContent><DialogActions><Button onClick={()=>setNewAdmin(false)}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" onClick={()=>void createAdmin()}>{l('Yaratish','Создать','Create')}</Button></DialogActions></Dialog></>;
}
