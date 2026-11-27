import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import { TextField } from '../components/AdminField';
import { Panel, useL, ErrorNotice } from '../components/AdminCommon';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';
import { errorText } from '../api/errorText';
import { prepareInvoiceImage, type Row } from '../api/managementApi';
import * as api from '../api/warehouseApi';
import { NewSupplierDialog, ProductPicker, ReceiptTotals } from './WarehousePage';

/**
 * "Yangi kirim" as its own page (owner request 2026-11-27, was a dialog): invoice details on top, one table row
 * per product, totals on the right, save at the bottom. Same rules and request as before (TZ v12 A4.1/A4.2, Q-4,
 * TZ v13 items 3, 6, 8, 9); after saving it goes back to Ombor → Kirimlar.
 */
type Line = { product: Row | null; quantity: string; location_id: string; unit_price: string; manufacture_date: string; expiry_date: string; input_unit: string; units_per_block: string; batch_number: string; price_note: string };
const blankLine = (): Line => ({ product: null, quantity: '1', location_id: '', unit_price: '', manufacture_date: '', expiry_date: '', input_unit: 'PIECE', units_per_block: '1', batch_number: '', price_note: '' });
const number = (n: unknown) => Number(n ?? 0).toLocaleString('ru-RU');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const pieces = (x: Line) => Number(x.quantity || 0) * (x.input_unit === 'BLOCK' ? Number(x.units_per_block || 0) : 1);

export default function ReceiptCreatePage() {
  const l = useL(), navigate = useNavigate(), { accessToken } = useAuth(), token = accessToken!;
  const [locations, setLocations] = useState<Row[]>([]), [supplierOptions, setSupplierOptions] = useState<Row[]>([]);
  const [supplierId, setSupplierId] = useState(''), [invoiceAmount, setInvoiceAmount] = useState(''), [invoiceDate, setInvoiceDate] = useState(today());
  const [invoice, setInvoice] = useState(''), [invoiceReason, setInvoiceReason] = useState(''), [invoiceImage, setInvoiceImage] = useState(''), [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([blankLine()]), [newSupplier, setNewSupplier] = useState<{ name: string; phone: string } | null>(null);
  const [costs, setCosts] = useState<Row | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([api.locations(token), api.suppliers(token)])
      .then(([loc, sup]) => { if (live) { setLocations(loc); setSupplierOptions(sup); setReady(true); } })
      .catch(e => { if (live) { setError(errorText(e, l)); setReady(true); } });
    return () => { live = false; };
  }, [token]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Q-4: previous purchase price per product and the % limit.
  const costKey = lines.map(x => x.product?.id).filter(Boolean).join(',');
  useEffect(() => {
    if (!costKey) { setCosts(null); return; }
    let live = true;
    api.previousCosts(token, costKey.split(',').map(Number)).then(r => { if (live) setCosts(r); }).catch(() => { if (live) setCosts(null); });
    return () => { live = false; };
  }, [token, costKey]);
  const priceJump = (x: Line) => { const prev = Number(costs?.costs?.[String(x.product?.id)]), price = Number(x.unit_price); if (!(prev > 0) || !(price > 0)) return null; const pct = Math.round(Math.abs(price - prev) / prev * 1000) / 10; return { prev, pct, over: pct > Number(costs?.threshold_percent ?? 20) }; };
  // TZ v12 A4.1: the debt follows the lines; a different invoice total needs a reason.
  const linesTotal = lines.reduce((s, x) => s + pieces(x) * Number(x.unit_price || 0), 0);
  const invoiceDiffers = !!supplierId && invoiceAmount !== '' && Math.abs(Number(invoiceAmount) - linesTotal) >= 0.005;
  const set = (i: number, patch: Partial<Line>) => setLines(v => v.map((x, n) => n === i ? { ...x, ...patch } : x));
  const bins = locations.filter(x => x.is_active && x.hierarchy_level === 'BIN');
  const anyBlock = lines.some(x => x.input_unit === 'BLOCK');

  const save = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const ids = lines.map(x => x.product?.id);
      if (!supplierId || !(Number(invoiceAmount) > 0) || !invoiceDate || !invoice.trim() || lines.some(x => !x.product || !x.location_id || !(Number(x.unit_price) > 0) || !x.expiry_date || (x.input_unit === 'BLOCK' && (!Number.isInteger(Number(x.units_per_block)) || Number(x.units_per_block) <= 0)) || !Number.isSafeInteger(Number(x.quantity)) || Number(x.quantity) <= 0) || new Set(ids).size !== ids.length)
        throw new ApiError('', new Set(ids).size !== ids.length ? 'WAREHOUSE_DUPLICATE_PRODUCT' : 'WAREHOUSE_INVALID_INPUT');
      if (costs?.note_required && lines.some(x => priceJump(x)?.over && !x.price_note.trim())) throw new ApiError('', 'RECEIPT_PRICE_NOTE_REQUIRED');
      if (invoiceDiffers && !invoiceReason.trim()) throw new ApiError('', 'RECEIPT_INVOICE_DIFFERENCE');
      await api.createReceipt(token, {
        supplier_name: '', supplier_id: Number(supplierId), invoice_amount: invoiceAmount, invoice_date: invoiceDate, invoice_difference_reason: invoiceDiffers ? invoiceReason.trim() : undefined,
        invoice_number: invoice, note, invoice_image_base64: invoiceImage || undefined,
        items: lines.map(x => ({ product_id: x.product!.id, quantity: Number(x.quantity), location_id: Number(x.location_id), unit_price: x.unit_price, manufacture_date: x.manufacture_date || undefined, expiry_date: x.expiry_date, input_unit: x.input_unit, units_per_block: Number(x.units_per_block), batch_number: x.batch_number, price_note: x.price_note.trim() || undefined })),
      });
      navigate('/warehouse?tab=2');
    } catch (e) { setError(errorText(e, l)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    finally { setBusy(false); }
  };

  const cell = { verticalAlign: 'top', py: 1.25, px: 0.75 } as const;
  return <>
    {/* Page header: back arrow + title, like the other create pages */}
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
      <Tooltip title={l('Ortga', 'Назад', 'Back')}><IconButton onClick={() => navigate('/warehouse?tab=2')} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: '#fff' }}><ArrowBackRounded /></IconButton></Tooltip>
      <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: 21, sm: 24 }, letterSpacing: -0.3 }}>{l('Yangi kirim', 'Новый приход', 'New receipt')}</Typography>
    </Stack>
    <ErrorNotice message={error} sx={{ mb: 2 }} onClose={() => setError('')} />
    {ready && !bins.length && <Alert severity="warning" sx={{ mb: 2 }}>{l('Avval Ombor → Manzillar bo‘limida manzil yarating.', 'Сначала создайте ячейку в разделе Склад → Ячейки.', 'Create a location in Warehouse → Locations first.')}</Alert>}

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 2, mb: 2 }}>
      <Panel sx={{ p: 2.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' }, gap: 2 }}>
          <TextField select required label={l('Yetkazib beruvchi', 'Поставщик', 'Supplier')} value={supplierId} onChange={e => { if (e.target.value === '__new') { setNewSupplier({ name: '', phone: '' }); return; } setSupplierId(e.target.value); }}>
            {supplierOptions.filter(s => s.is_active).map(s => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
            <MenuItem value="__new" sx={{ color: 'primary.main', fontWeight: 700 }}>+ {l('Yangi yetkazib beruvchi', 'Новый поставщик', 'New supplier')}</MenuItem>
          </TextField>
          <TextField required label={l('Nakladnoy raqami', 'Номер накладной', 'Invoice number')} value={invoice} onChange={e => setInvoice(e.target.value)} />
          <TextField required type="date" label={l('Nakladnoy sanasi', 'Дата накладной', 'Invoice date')} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          <TextField required type="number" label={l('Nakladnoy jami summasi', 'Общая сумма накладной', 'Invoice total')} value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} />
          <TextField label={l('Izoh', 'Примечание', 'Note')} value={note} onChange={e => setNote(e.target.value)} sx={{ gridColumn: { xl: 'span 2' } }} />
        </Box>
        {invoiceDiffers && <Box sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 1.5 }}>{l(`Nakladnoy summasi qatorlar yig‘indisidan farq qiladi: qatorlar ${number(linesTotal)}, nakladnoy ${number(invoiceAmount)}. Qarz qatorlar bo‘yicha yoziladi.`, `Сумма накладной отличается от суммы строк: строки ${number(linesTotal)}, накладная ${number(invoiceAmount)}. Долг считается по строкам.`, `Invoice total differs from the lines: lines ${number(linesTotal)}, invoice ${number(invoiceAmount)}. The debt follows the lines.`)}</Alert>
          <TextField required fullWidth label={l('Farq sababi', 'Причина разницы', 'Reason for the difference')} value={invoiceReason} onChange={e => setInvoiceReason(e.target.value)} />
        </Box>}
        <Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: 'center' }}>
          <Button variant="outlined" component="label" disabled={busy}>{l('Nakladnoy rasmini tanlash', 'Фото накладной', 'Choose invoice photo')}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) void prepareInvoiceImage(file).then(setInvoiceImage).catch(err => setError(errorText(err, l))); e.target.value = ''; }} /></Button>
          {invoiceImage && <><Box component="img" src={`data:image/png;base64,${invoiceImage}`} sx={{ height: 56, borderRadius: 1, border: '1px solid', borderColor: 'divider' }} /><Button color="error" onClick={() => setInvoiceImage('')}>{l('Rasmni olib tashlash', 'Удалить фото', 'Remove photo')}</Button></>}
        </Stack>
      </Panel>
      <Panel sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>{l('Jami', 'Итого', 'Totals')}</Typography>
        <ReceiptTotals l={l} rows={lines.map(x => ({ pieces: pieces(x), blocks: x.input_unit === 'BLOCK' ? Number(x.quantity || 0) : 0, price: Number(x.unit_price || 0), weight: Number(x.product?.weight_gram || 0) }))} />
        <Alert severity="info" sx={{ mt: 2 }}>{l('Qoralama qoldiqni o‘zgartirmaydi. Saqlagandan keyin Kirimlar ro‘yxatida tekshiring va tasdiqlang.', 'Черновик не меняет остаток. После сохранения проверьте и подтвердите его в списке приходов.', 'A draft does not change stock. Review and confirm it in the receipts list after saving.')}</Alert>
      </Panel>
    </Box>

    {/* One row per product */}
    <Panel sx={{ mb: 2 }}>
      <Stack direction="row" sx={{ px: 2, pt: 1.75, pb: 1, alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 17, flex: 1 }}>{l('Mahsulotlar', 'Товары', 'Products')} ({lines.length})</Typography>
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1500, '& thead th': { bgcolor: '#F7F8FB', fontWeight: 700, color: '#4A4F63', whiteSpace: 'nowrap', px: 0.75 } }}>
          <TableHead><TableRow>
            <TableCell sx={{ width: 36 }}>#</TableCell>
            <TableCell sx={{ minWidth: 280 }}>{l('Mahsulot', 'Товар', 'Product')} *</TableCell>
            <TableCell sx={{ width: 110 }}>{l('Birlik', 'Единица', 'Unit')}</TableCell>
            <TableCell sx={{ width: 110 }}>{l('Soni', 'Кол-во', 'Quantity')} *</TableCell>
            {anyBlock && <TableCell sx={{ width: 120 }}>{l('Blokdagi dona', 'Штук в блоке', 'Pcs per block')} *</TableCell>}
            <TableCell sx={{ width: 150 }}>{l('Narx (1 dona)', 'Цена за шт.', 'Price per piece')} *</TableCell>
            <TableCell sx={{ width: 130 }} align="right">{l('Summa', 'Сумма', 'Amount')}</TableCell>
            <TableCell sx={{ width: 170 }}>{l('Manzil', 'Ячейка', 'Location')} *</TableCell>
            <TableCell sx={{ width: 160 }}>{l('Ishlab chiqarilgan', 'Дата производства', 'Manufactured')}</TableCell>
            <TableCell sx={{ width: 160 }}>{l('Yaroqlilik sanasi', 'Годен до', 'Expiry date')} *</TableCell>
            <TableCell sx={{ width: 140 }}>{l('Partiya raqami', 'Номер партии', 'Batch number')}</TableCell>
            <TableCell sx={{ width: 44 }} />
          </TableRow></TableHead>
          <TableBody>
            {lines.map((x, i) => { const jump = priceJump(x); return <TableRow key={i} sx={{ '&:hover td': { bgcolor: '#FFFAF9' } }}>
              <TableCell sx={{ ...cell, pt: 2.25, fontWeight: 700, color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell sx={cell}>
                <ProductPicker token={token} activeOnly={false} value={x.product} label={l('Mahsulot', 'Товар', 'Product')} onChange={v => set(i, { product: v })} />
                {(costs?.untracked as number[] | undefined)?.includes(Number(x.product?.id)) && (Number(x.product?.stock_quantity || 0) === 0
                  ? <Typography variant="caption" color="text.secondary">{l('Tasdiqlanganda partiya hisobiga o‘tadi.', 'После подтверждения перейдёт на партионный учёт.', 'Moves to batch tracking on confirmation.')}</Typography>
                  : <Typography variant="caption" color="warning.main">{l(`Eski qoldiq ${x.product?.stock_quantity} dona, muddati noma’lum: avval boshlang‘ich sanash qiling.`, `Старый остаток ${x.product?.stock_quantity} шт. без срока: сначала начальный пересчёт.`, `${x.product?.stock_quantity} old pieces without expiry: do an opening count first.`)}</Typography>)}
              </TableCell>
              <TableCell sx={cell}><TextField select size="small" fullWidth value={x.input_unit} onChange={e => set(i, { input_unit: e.target.value })}><MenuItem value="PIECE">{l('Dona', 'Штука', 'Piece')}</MenuItem><MenuItem value="BLOCK">{l('Blok', 'Блок', 'Block')}</MenuItem></TextField></TableCell>
              <TableCell sx={cell}><TextField size="small" fullWidth required type="number" value={x.quantity} onChange={e => set(i, { quantity: e.target.value })} /></TableCell>
              {anyBlock && <TableCell sx={cell}>{x.input_unit === 'BLOCK' ? <TextField size="small" fullWidth required type="number" value={x.units_per_block} onChange={e => set(i, { units_per_block: e.target.value })} /> : <Typography sx={{ pt: 1, color: 'text.secondary' }}>—</Typography>}</TableCell>}
              <TableCell sx={cell}>
                <TextField size="small" fullWidth required type="number" value={x.unit_price} onChange={e => set(i, { unit_price: e.target.value })} color={jump?.over ? 'warning' : undefined} focused={jump?.over || undefined}
                  helperText={jump ? `${l('Oldingi', 'Прошлая', 'Previous')}: ${number(jump.prev)} · ${jump.pct}%` : undefined} />
                {jump?.over && <TextField size="small" fullWidth required={Boolean(costs?.note_required)} sx={{ mt: 1 }} label={l('Narx farqi izohi', 'Причина разницы', 'Price note')} value={x.price_note} onChange={e => set(i, { price_note: e.target.value })} />}
              </TableCell>
              <TableCell sx={{ ...cell, pt: 2, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{number(pieces(x) * Number(x.unit_price || 0))}</TableCell>
              <TableCell sx={cell}><TextField select size="small" fullWidth required value={x.location_id} onChange={e => set(i, { location_id: e.target.value })}>{bins.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.path || b.code}</MenuItem>)}</TextField></TableCell>
              <TableCell sx={cell}><TextField size="small" fullWidth type="date" value={x.manufacture_date} onChange={e => set(i, { manufacture_date: e.target.value })} /></TableCell>
              <TableCell sx={cell}><TextField size="small" fullWidth required type="date" value={x.expiry_date} onChange={e => set(i, { expiry_date: e.target.value })} /></TableCell>
              <TableCell sx={cell}><TextField size="small" fullWidth value={x.batch_number} onChange={e => set(i, { batch_number: e.target.value })} /></TableCell>
              <TableCell sx={{ ...cell, pt: 1.25 }}><Tooltip title={l('Qatorni o‘chirish', 'Удалить строку', 'Remove row')}><span><IconButton color="error" disabled={lines.length === 1 || busy} onClick={() => setLines(v => v.filter((_, n) => n !== i))}><DeleteOutlineRounded /></IconButton></span></Tooltip></TableCell>
            </TableRow>; })}
            <TableRow sx={{ '& td': { fontWeight: 800, bgcolor: '#FFF3F2' } }}>
              <TableCell colSpan={3}>{l('Jami', 'Итого', 'Total')}</TableCell>
              <TableCell>{number(lines.reduce((s, x) => s + pieces(x), 0))} {l('dona', 'шт.', 'pcs')}</TableCell>
              {anyBlock && <TableCell />}
              <TableCell />
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{number(linesTotal)}</TableCell>
              <TableCell colSpan={5} />
            </TableRow>
          </TableBody>
        </Table>
      </Box>
      <Box sx={{ p: 2 }}><Button variant="outlined" startIcon={<AddRounded />} disabled={lines.length >= 100 || busy} onClick={() => setLines(v => [...v, blankLine()])}>{l('Mahsulot qo‘shish', 'Добавить товар', 'Add product')}</Button></Box>
    </Panel>

    <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
      <Button disabled={busy} onClick={() => navigate('/warehouse?tab=2')}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
      <Button variant="contained" size="large" disabled={busy || !bins.length} onClick={() => void save()}>{busy ? l('Saqlanmoqda…', 'Сохранение…', 'Saving…') : l('Qoralama saqlash', 'Сохранить черновик', 'Save draft')}</Button>
    </Stack>
    <NewSupplierDialog token={token} value={newSupplier} onClose={() => setNewSupplier(null)} onCreated={async id => { setSupplierOptions(await api.suppliers(token)); setSupplierId(String(id)); setNewSupplier(null); }} />
  </>;
}
