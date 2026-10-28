import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { TextField } from '../components/AdminField';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { can } from '../auth/permissions';
import { PageTitle, Panel, TablePanel, dateTime, useEnumLabel, useL, ErrorNotice } from '../components/AdminCommon';
import { apiRequest } from '../api/client';
import { listCategories, listDeliveryWorkers, listProducts, type Row } from '../api/managementApi';
import { locations as listLocations, suppliers as listSuppliers } from '../api/warehouseApi';

// TZ v10 §11 "Hisobotlar": pick a report, set filters, view it and download the same rows as .xlsx (numbers stay numbers, totals match the screen).
type L = ReturnType<typeof useL>;
type Filter = 'period' | 'date' | 'product' | 'category' | 'location' | 'supplier' | 'courier' | 'days' | 'group';
type Column = { key: string; type: 'text' | 'number' | 'money' | 'percent' | 'date' | 'datetime' | 'status'; sum: boolean };
type Report = { code: string; title: [string, string, string]; filters: Filter[]; groups?: [string, [string, string, string]][]; days?: number; note?: [string, string, string] };
const base = '/ninimum/api/v1/admin/reports';
const tashkentToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
const monthStart = () => `${tashkentToday().slice(0, 8)}01`;
const day = (v: unknown) => { const [y, m, d] = String(v || '').slice(0, 10).split('-'); return d ? `${d}.${m}.${y}` : '—'; };

const REPORTS: Report[] = [
  { code: 'stock', title: ['1. Qoldiq (hozir / sanaga)', '1. Остатки (сейчас / на дату)', '1. Stock (now / at a date)'], filters: ['date', 'product', 'category'], note: ['Sana tanlansa, o‘sha kun oxiridagi erkin qoldiq ko‘rsatiladi (bron faqat hozir uchun).', 'Если выбрана дата — свободный остаток на конец дня (бронь только на сейчас).', 'With a date: free stock at the end of that day (reserved only for now).'] },
  { code: 'turnover', title: ['2. Tovar aylanmasi', '2. Оборот товара', '2. Stock turnover'], filters: ['period', 'product', 'category'], note: ['Oxiri = Boshi + Kirim + Korrektirovka(+) + Mijozdan qaytish − Sotuv − Yetkazib beruvchiga qaytarish − Spisaniya − Korrektirovka(−).', 'Конец = Начало + Приход + Корр.(+) + Возврат клиента − Продажа − Возврат поставщику − Списание − Корр.(−).', 'End = Start + Receipts + Adj.(+) + Customer returns − Sales − Supplier returns − Write-offs − Adj.(−).'] },
  { code: 'bins', title: ['3. Manzillar bo‘yicha qoldiq', '3. Остатки по ячейкам', '3. Stock by bin'], filters: ['location', 'product', 'category'] },
  { code: 'unplaced', title: ['4. Joylashtirilmagan tovar', '4. Неразмещённый товар', '4. Goods not put away'], filters: ['product'] },
  { code: 'receipts', title: ['5. Kirimlar va nomuvofiqliklar', '5. Приходы и расхождения', '5. Receipts and mismatches'], filters: ['period', 'supplier', 'product'] },
  { code: 'writeoffs', title: ['6. Spisaniya', '6. Списания', '6. Write-offs'], filters: ['period', 'product', 'location'] },
  { code: 'expiry', title: ['7. Muddatlar', '7. Сроки годности', '7. Expiry dates'], filters: ['days', 'product', 'location'], days: 30 },
  { code: 'counts', title: ['8. Sanash natijalari', '8. Результаты пересчётов', '8. Count results'], filters: ['period', 'location', 'product'] },
  { code: 'order-flow', title: ['9. Buyurtma oqimi', '9. Поток заказов', '9. Order flow'], filters: ['period', 'group'], groups: [['status', ['Holat bo‘yicha', 'По статусам', 'By status']], ['packer', ['Yig‘uvchi bo‘yicha', 'По сборщикам', 'By packer']]] },
  { code: 'problems', title: ['10. Muammolar va pul nazorati', '10. Проблемы и контроль денег', '10. Problems and money control'], filters: [] },
  { code: 'reasons', title: ['11. Bekor va qaytarish sabablari', '11. Причины отмен и возвратов', '11. Cancellation and return reasons'], filters: ['period'] },
  { code: 'couriers', title: ['12. Kuryerlar', '12. Курьеры', '12. Couriers'], filters: ['period', 'courier'] },
  { code: 'sales', title: ['13. Sotuv va yalpi foyda', '13. Продажи и валовая прибыль', '13. Sales and gross profit'], filters: ['period', 'group', 'product', 'category'], groups: [['product', ['Tovar bo‘yicha', 'По товарам', 'By product']], ['category', ['Kategoriya bo‘yicha', 'По категориям', 'By category']], ['day', ['Kun bo‘yicha', 'По дням', 'By day']]], note: ['Yetkazilgan buyurtmalar, qisman qaytarilganlar ayirilgan. Tannarx: sotuv paytidagi tannarx, bo‘lmasa mahsulot tannarxi.', 'Доставленные заказы за вычетом частичных возвратов. Себестоимость: на момент продажи, иначе себестоимость товара.', 'Delivered orders less partial returns. Cost: at the time of sale, else the product cost price.'] },
  { code: 'dead-stock', title: ['14. Harakatsiz tovar', '14. Неликвидный товар', '14. Dead stock'], filters: ['days', 'product', 'category'], days: 30 },
  { code: 'reorder', title: ['15. Tavsiya etilgan zaxira', '15. Рекомендуемый запас', '15. Suggested stock'], filters: ['period', 'product', 'category'], note: ['Kunlik o‘rtacha = davrdagi sotuv ÷ davrdagi kalendar kunlar. Necha kunga yetadi = erkin qoldiq ÷ kunlik o‘rtacha.', 'Среднее в день = продажи за период ÷ календарные дни. Хватит на дней = свободный остаток ÷ среднее в день.', 'Daily average = sales in the period ÷ calendar days. Days of cover = free stock ÷ daily average.'] },
  { code: 'payment-calendar', title: ['16. To‘lov kalendari', '16. Платёжный календарь', '16. Payment calendar'], filters: ['supplier'] },
  { code: 'supplier-turnover', title: ['17. Yetkazib beruvchi oboroti', '17. Оборот поставщика', '17. Supplier turnover'], filters: ['period', 'supplier'] },
  { code: 'subscriptions', title: ['18. Obunalar', '18. Подписки', '18. Subscriptions'], filters: ['period'] },
];

const labels = (l: L): Record<string, string> => ({
  product_name: l('Mahsulot', 'Товар', 'Product'), category_name: l('Kategoriya', 'Категория', 'Category'), physical: l('Jismoniy', 'Физически', 'Physical'), reserved: l('Bron', 'Бронь', 'Reserved'), free: l('Erkin', 'Свободно', 'Free'),
  unit_cost: l('Tannarx (dona)', 'Себестоимость (шт.)', 'Unit cost'), cost_sum: l('Tannarx summasi', 'Сумма по себестоимости', 'Cost value'), sale_price: l('Sotuv narxi', 'Цена продажи', 'Sale price'), sale_sum: l('Sotuv narxidagi summa', 'Сумма по цене продажи', 'Sale value'),
  start: l('Boshi', 'Начало', 'Start'), receipt: l('Kirim', 'Приход', 'Receipts'), adjust_plus: l('Korrektirovka +', 'Корректировка +', 'Adjustment +'), customer_return: l('Mijozdan qaytish', 'Возврат клиента', 'Customer returns'),
  sale: l('Sotuv', 'Продажа', 'Sales'), supplier_return: l('Yetkazib beruvchiga qaytarish', 'Возврат поставщику', 'Supplier returns'), writeoff: l('Spisaniya', 'Списание', 'Write-off'), adjust_minus: l('Korrektirovka −', 'Корректировка −', 'Adjustment −'), end: l('Oxiri', 'Конец', 'End'),
  location_code: l('Manzil', 'Ячейка', 'Bin'), quantity: l('Soni', 'Кол-во', 'Quantity'), batch_number: l('Partiya', 'Партия', 'Batch'), expiry_date: l('Muddat', 'Срок', 'Expiry'), last_movement: l('Oxirgi harakat', 'Последнее движение', 'Last movement'),
  received_at: l('Qachondan', 'С какого времени', 'Since'), received_by: l('Kim qabul qildi', 'Кто принял', 'Received by'), days: l('Kun', 'Дней', 'Days'),
  receipt_no: 'KR', created_at: l('Sana', 'Дата', 'Date'), status: l('Holat', 'Статус', 'Status'), supplier_name: l('Yetkazib beruvchi', 'Поставщик', 'Supplier'), invoice_number: l('Nakladnoy', 'Накладная', 'Invoice'),
  invoice_quantity: l('Nakladnoyda', 'По накладной', 'Invoiced'), fit_quantity: l('Keldi (yaroqli)', 'Принято (годное)', 'Arrived (fit)'), unfit_quantity: l('Yaroqsiz', 'Негодное', 'Unfit'), difference: l('Farq', 'Разница', 'Difference'),
  unfit_condition: l('Yaroqsiz holati', 'Состояние негодного', 'Unfit condition'), unit_price: l('Kirim narxi', 'Цена прихода', 'Purchase price'), amount: l('Summa', 'Сумма', 'Amount'),
  document: l('Hujjat', 'Документ', 'Document'), approved_at: l('Tasdiqlangan', 'Проведено', 'Approved'), reason_code: l('Sabab turi', 'Тип причины', 'Reason type'), reason: l('Sabab / izoh', 'Причина / комментарий', 'Reason / note'),
  cost: l('Tannarx', 'Себестоимость', 'Cost'), created_by: l('Kim', 'Кто', 'By'), approved_by: l('Tasdiqladi', 'Провёл', 'Approved by'), sales_share: l('Sotuvga nisbatan %', '% от продаж', '% of sales'),
  days_left: l('Necha kun qoldi', 'Осталось дней', 'Days left'), expected: l('Tizimda', 'В системе', 'System'), counted: l('Sanaldi', 'Посчитано', 'Counted'), difference_sum: l('Farq, so‘m', 'Разница, сум', 'Difference, UZS'),
  worker: l('Yig‘uvchi', 'Сборщик', 'Packer'), orders: l('Buyurtmalar', 'Заказы', 'Orders'), avg_minutes: l('O‘rtacha, daqiqa', 'Среднее, мин', 'Average, min'), max_minutes: l('Eng uzun, daqiqa', 'Максимум, мин', 'Longest, min'), overdue: l('Taymer oshgan', 'Таймер превышен', 'Timer exceeded'),
  problem: l('Muammo', 'Проблема', 'Problem'), order_number: l('Buyurtma', 'Заказ', 'Order'), ordered_at: l('Buyurtma vaqti', 'Время заказа', 'Ordered'), type: l('Turi', 'Тип', 'Type'), share: '%',
  courier: l('Kuryer', 'Курьер', 'Courier'), delivered: l('Yetkazildi', 'Доставлено', 'Delivered'), failed: l('Yetkazilmadi', 'Не доставлено', 'Failed'), declined: l('Rad etdi', 'Отказался', 'Declined'), expired: l('Javob bermadi', 'Не ответил', 'No answer'),
  day: l('Kun', 'День', 'Day'), sales: l('Sotuv', 'Продажи', 'Sales'), profit: l('Yalpi foyda', 'Валовая прибыль', 'Gross profit'), margin: l('Marja %', 'Маржа %', 'Margin %'), cost_missing: l('Tannarxsiz qatorlar', 'Строк без себестоимости', 'Lines without cost'),
  stock: l('Qoldiq', 'Остаток', 'Stock'), last_sale: l('Oxirgi sotuv', 'Последняя продажа', 'Last sale'), days_without_sale: l('Sotilmagan kunlar', 'Дней без продаж', 'Days without sale'), frozen_money: l('Qotgan pul', 'Замороженные деньги', 'Money tied up'),
  sold: l('Sotildi', 'Продано', 'Sold'), daily_avg: l('Kunlik o‘rtacha', 'Среднее в день', 'Daily average'), days_cover: l('Necha kunga yetadi', 'Хватит на дней', 'Days of cover'),
  need_7: l('7 kunga tavsiya', 'Рекомендация на 7 дней', 'Suggested for 7 days'), need_14: l('14 kunga tavsiya', 'Рекомендация на 14 дней', 'Suggested for 14 days'), need_30: l('30 kunga tavsiya', 'Рекомендация на 30 дней', 'Suggested for 30 days'),
  invoice_date: l('Nakladnoy sanasi', 'Дата накладной', 'Invoice date'), paid: l('To‘langan', 'Оплачено', 'Paid'), outstanding: l('Qoldiq', 'Остаток долга', 'Outstanding'), due_date: l('Muddat', 'Срок оплаты', 'Due date'),
  receipts: l('Kirim', 'Приход', 'Receipts'), payments: l('To‘lov', 'Оплата', 'Payments'), returns: l('Qaytarish', 'Возврат', 'Returns'),
  plan: l('Tarif', 'Тариф', 'Plan'), active: l('Faol', 'Активные', 'Active'), new: l('Yangi', 'Новые', 'New'), ended: l('Tugagan', 'Закончились', 'Ended'), renewed: l('Uzaytirilgan', 'Продлены', 'Renewed'), income: l('Obuna tushumi', 'Доход от подписок', 'Subscription income'),
});
const statusLabels = (l: L): Record<string, string> => ({
  PAID_NOT_DELIVERED: l('To‘langan, yetkazilmagan', 'Оплачен, не доставлен', 'Paid, not delivered'), PAID_CANCELLED: l('To‘langan, bekor qilingan (pul qaytmagan)', 'Оплачен и отменён (деньги не возвращены)', 'Paid and cancelled (not refunded)'),
  REFUND_PENDING: l('Qisman qaytarish puli qaytarilmagan', 'Частичный возврат не выплачен', 'Partial refund not paid'), CANCELLED: l('Bekor qilingan', 'Отменён', 'Cancelled'), DELIVERY_FAILED: l('Yetkazilmadi', 'Не доставлен', 'Delivery failed'),
  PARTIAL_RETURN: l('Qisman qaytarish', 'Частичный возврат', 'Partial return'), DAMAGED: l('Shikastlangan', 'Повреждён', 'Damaged'), EXPIRED: l('Muddati o‘tgan', 'Просрочен', 'Expired'), WRONG_PRODUCT: l('Noto‘g‘ri tovar', 'Не тот товар', 'Wrong product'),
  WAREHOUSE_DAMAGE: l('Omborda shikastlangan', 'Повреждён на складе', 'Damaged in warehouse'), DELIVERY_DAMAGE: l('Yetkazishda shikastlangan', 'Повреждён при доставке', 'Damaged in delivery'), LOST: l('Yo‘qolgan', 'Утерян', 'Lost'),
  SAMPLE: l('Namuna', 'Образец', 'Sample'), INTERNAL: l('Ichki ehtiyoj', 'Внутренние нужды', 'Internal use'), OTHER: l('Boshqa', 'Другое', 'Other'),
});

export default function ReportsPage() {
  const { accessToken, admin } = useAuth(), token = accessToken!, l = useL(), enumLabel = useEnumLabel(), navigate = useNavigate();
  const [available, setAvailable] = useState<string[] | null>(null), [code, setCode] = useState(''), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState<'' | 'show' | 'excel'>('');
  const [f, setF] = useState<Record<string, string>>({ from: monthStart(), to: tashkentToday() });
  const [result, setResult] = useState<{ columns: Column[]; rows: Row[]; code: string; from: string; to: string } | null>(null);
  const [lists, setLists] = useState<{ products: Row[]; categories: Row[]; locations: Row[]; suppliers: Row[]; couriers: Row[] }>({ products: [], categories: [], locations: [], suppliers: [], couriers: [] });
  const [presets, setPresets] = useState<Row[]>(() => { try { return JSON.parse(localStorage.getItem('ninimum.reportPresets') || '[]'); } catch { return []; } }), [presetName, setPresetName] = useState('');
  const report = REPORTS.find(r => r.code === code), names = labels(l), statuses = statusLabels(l);
  const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => {
    apiRequest<string[]>(base, { token }).then(r => { setAvailable(r.resultData); if (r.resultData.length) setCode(c => c || r.resultData[0]); }).catch(() => setError(l('Hisobotlar ro‘yxatini yuklab bo‘lmadi.', 'Не удалось загрузить список отчётов.', 'Could not load the reports.')));
    // Filter lists: each one only if the user may read it.
    const keep = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    void Promise.all([keep(listProducts(token, { page: 1, page_size: 500 }).then(d => d.items), [] as Row[]), keep(listCategories(token), [] as Row[]), keep(listLocations(token), [] as Row[]), keep(listSuppliers(token), [] as Row[]), keep(listDeliveryWorkers(token), [] as Row[])])
      .then(([products, categories, locations, suppliers, couriers]) => setLists({ products, categories, locations, suppliers, couriers }));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = () => {
    const p = new URLSearchParams(), use = (k: string) => { if (f[k]) p.set(k, f[k]); };
    report?.filters.forEach(x => x === 'period' ? (use('from'), use('to')) : x === 'product' ? use('product_id') : x === 'category' ? use('category_id') : x === 'location' ? use('location_id') : x === 'supplier' ? use('supplier_id') : x === 'courier' ? use('courier_id') : use(x));
    if (report?.filters.includes('days') && !f.days) p.set('days', String(report.days ?? 30));
    return p.toString();
  };
  const show = async () => {
    if (!report) return; setBusy('show'); setError(null);
    try { setResult((await apiRequest<{ columns: Column[]; rows: Row[]; code: string; from: string; to: string }>(`${base}/${report.code}?${params()}`, { token })).resultData); }
    catch (e) { const c = e instanceof Error ? e.message : ''; setResult(null); setError(c === 'ADMIN_PERMISSION_DENIED' ? l('Bu hisobot uchun ruxsatingiz yo‘q.', 'Нет прав на этот отчёт.', 'You are not allowed to open this report.') : c === 'WAREHOUSE_INVALID_INPUT' ? l('Filtrlarni tekshiring (sanalar to‘g‘ri tartibda bo‘lsin).', 'Проверьте фильтры (даты в правильном порядке).', 'Check the filters (dates in the right order).') : l('Hisobotni yuklab bo‘lmadi.', 'Не удалось загрузить отчёт.', 'Could not load the report.')); }
    finally { setBusy(''); }
  };
  useEffect(() => { setResult(null); }, [code]);

  const totals = useMemo(() => {
    if (!result) return null;
    const t: Record<string, number> = {};
    for (const c of result.columns) if (c.sum) t[c.key] = result.rows.reduce((s, r) => s + Number(r[c.key] ?? 0), 0);
    return t;
  }, [result]);
  const cell = (c: Column, v: unknown) => {
    if (v === null || v === undefined || v === '') return '—';
    if (c.type === 'money') return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c.type === 'number') return Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (c.type === 'percent') return `${Number(v).toFixed(1)}%`;
    if (c.type === 'date') return day(v);
    if (c.type === 'datetime') return dateTime(v);
    if (c.type === 'status') return statuses[String(v)] ?? enumLabel(v);
    return String(v);
  };
  const title = (c: Column) => c.key === 'receipt' && result?.code !== 'turnover' ? 'KR' : names[c.key] ?? c.key;

  const excel = async () => {
    if (!result || !report) return;
    setBusy('excel'); setError(null);
    try {
    // Excel sheet names can't contain \ / ? * [ ] : and are at most 31 characters.
    const { Workbook } = await import('exceljs'); const book = new Workbook(); const sheet = book.addWorksheet(l(...report.title).replace(/^\d+\.\s*/, '').replace(/[\\/?*[\]:]/g, '-').slice(0, 31));
    sheet.addRow([l(...report.title)]); sheet.getRow(1).font = { bold: true, size: 13 };
    if (report.filters.includes('period')) sheet.addRow([l('Davr', 'Период', 'Period'), `${day(result.from)} – ${day(result.to)}`]);
    if (f.date && report.filters.includes('date')) sheet.addRow([l('Sana', 'Дата', 'Date'), day(f.date)]);
    sheet.addRow([]);
    const header = sheet.addRow(result.columns.map(title)); header.font = { bold: true }; header.alignment = { wrapText: true };
    const first = sheet.rowCount + 1;
    for (const r of result.rows) sheet.addRow(result.columns.map(c => {
      const v = r[c.key]; if (v === null || v === undefined || v === '') return null;
      if (['number', 'money', 'percent'].includes(c.type)) return Number(v);
      if (c.type === 'date') { const [y, m, d] = String(v).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
      if (c.type === 'datetime') { const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(dateTime(v)); return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5])) : null; }
      return c.type === 'status' ? cell(c, v) : String(v);
    }));
    if (totals && Object.keys(totals).length) { const t = sheet.addRow(result.columns.map((c, i) => i === 0 ? l('Jami', 'Итого', 'Total') : c.sum ? totals[c.key] : null)); t.font = { bold: true }; }
    result.columns.forEach((c, i) => {
      const col = sheet.getColumn(i + 1); col.width = c.type === 'text' ? 28 : 16;
      col.numFmt = c.type === 'money' ? '#,##0.00' : c.type === 'number' ? '#,##0.#' : c.type === 'percent' ? '0.0' : c.type === 'date' ? 'dd.mm.yyyy' : c.type === 'datetime' ? 'dd.mm.yyyy hh:mm' : '@';
    });
    sheet.views = [{ state: 'frozen', ySplit: first - 1 }];
    const blob = new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ninimum-${report.code}-${tashkentToday()}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { setError(l('Excel faylini yaratib bo‘lmadi.', 'Не удалось создать файл Excel.', 'Could not create the Excel file.')); }
    finally { setBusy(''); }
  };

  const savePreset = () => {
    const name = presetName.trim(); if (!name || !report) return;
    const next = [...presets.filter(p => p.name !== name), { name, code: report.code, filters: f }];
    setPresets(next); setPresetName(''); try { localStorage.setItem('ninimum.reportPresets', JSON.stringify(next)); } catch { /* storage off: kept for this visit only */ }
  };
  const removePreset = (name: string) => { const next = presets.filter(p => p.name !== name); setPresets(next); try { localStorage.setItem('ninimum.reportPresets', JSON.stringify(next)); } catch { /* ignore */ } };

  const pick = (key: string, label: string, options: Row[], text: (o: Row) => string) =>
    <TextField select size="small" label={label} value={f[key] || ''} onChange={e => set(key, e.target.value)} sx={{ minWidth: 180 }}>
      <MenuItem value="">{l('Hammasi', 'Все', 'All')}</MenuItem>{options.map(o => <MenuItem key={String(o.id)} value={String(o.id)}>{text(o)}</MenuItem>)}
    </TextField>;
  const productValue = lists.products.find(p => String(p.id) === f.product_id) ?? null;
  const shown = REPORTS.filter(r => available?.includes(r.code));

  return <>
    <PageTitle title={l('Hisobotlar', 'Отчёты', 'Reports')} />
    <ErrorNotice message={error} sx={{mb:2}} onClose={()=>setError(null)}/>
    <Panel sx={{ p: 2, mb: 2 }}><Stack spacing={2}>
      <TextField select size="small" label={l('Hisobot', 'Отчёт', 'Report')} value={code} onChange={e => setCode(e.target.value)} sx={{ maxWidth: 520 }}>
        {shown.map(r => <MenuItem key={r.code} value={r.code}>{l(...r.title)}</MenuItem>)}
      </TextField>
      {can(admin, 'money.view') && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{l('19. Pul harakati va 20. Oylik natija — "Pul" bo‘limida.', '19. Движение денег и 20. Итог месяца — в разделе «Деньги».', '19. Money movement and 20. Monthly result are on the Money page.')} <Button size="small" onClick={() => navigate('/finance')}>{l('Pul', 'Деньги', 'Money')}</Button></Typography>}
      {report && <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {report.filters.includes('period') && <><TextField size="small" type="date" label={l('Dan', 'С', 'From')} value={f.from || ''} onChange={e => set('from', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label={l('Gacha', 'По', 'To')} value={f.to || ''} onChange={e => set('to', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></>}
        {report.filters.includes('date') && <TextField size="small" type="date" label={l('Sanaga (bo‘sh = hozir)', 'На дату (пусто = сейчас)', 'At date (empty = now)')} value={f.date || ''} onChange={e => set('date', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />}
        {report.filters.includes('days') && <TextField size="small" type="number" label={report.code === 'expiry' ? l('Necha kun ichida', 'В течение дней', 'Within days') : l('Necha kun sotilmagan', 'Дней без продаж', 'Days without sale')} value={f.days || String(report.days ?? 30)} onChange={e => set('days', e.target.value)} sx={{ width: 170 }} slotProps={{ htmlInput: { min: 1 } }} />}
        {report.filters.includes('group') && report.groups && <TextField select size="small" label={l('Guruhlash', 'Группировка', 'Group by')} value={f.group && report.groups.some(g => g[0] === f.group) ? f.group : report.groups[0][0]} onChange={e => set('group', e.target.value)} sx={{ minWidth: 180 }}>
          {report.groups.map(([v, t]) => <MenuItem key={v} value={v}>{l(...t)}</MenuItem>)}</TextField>}
        {report.filters.includes('product') && lists.products.length > 0 && <Autocomplete size="small" sx={{ minWidth: 240 }} options={lists.products} value={productValue} getOptionLabel={o => String(o.name)} isOptionEqualToValue={(a, b) => a.id === b.id} onChange={(_, v) => set('product_id', v ? String(v.id) : '')} renderInput={p => <TextField {...p} label={l('Mahsulot', 'Товар', 'Product')} />} />}
        {report.filters.includes('category') && lists.categories.length > 0 && pick('category_id', l('Kategoriya', 'Категория', 'Category'), lists.categories, o => String(o.name_uz || o.name))}
        {report.filters.includes('location') && lists.locations.length > 0 && pick('location_id', l('Manzil', 'Ячейка', 'Bin'), lists.locations, o => String(o.code))}
        {report.filters.includes('supplier') && lists.suppliers.length > 0 && pick('supplier_id', l('Yetkazib beruvchi', 'Поставщик', 'Supplier'), lists.suppliers, o => String(o.name))}
        {report.filters.includes('courier') && lists.couriers.length > 0 && pick('courier_id', l('Kuryer', 'Курьер', 'Courier'), lists.couriers, o => String(o.full_name || o.name || o.worker_code))}
        <Button variant="contained" disabled={!!busy} startIcon={busy === 'show' ? <CircularProgress size={16} color="inherit" /> : undefined} onClick={() => void show()}>{busy === 'show' ? l('Yuklanmoqda…', 'Загрузка…', 'Loading…') : l('Ko‘rsatish', 'Показать', 'Show')}</Button>
        <Button variant="outlined" disabled={!!busy || !result} startIcon={busy === 'excel' ? <CircularProgress size={16} color="inherit" /> : undefined} onClick={() => void excel()}>{busy === 'excel' ? l('Fayl tayyorlanmoqda…', 'Готовим файл…', 'Preparing file…') : l('Excelga yuklash', 'Скачать Excel', 'Download Excel')}</Button>
      </Stack>}
      {report?.note && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{l(...report.note)}</Typography>}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label={l('Sozlamani nom bilan saqlash', 'Сохранить настройку под именем', 'Save these settings as')} value={presetName} onChange={e => setPresetName(e.target.value)} sx={{ minWidth: 240 }} />
        <Button size="small" disabled={!presetName.trim() || !report} onClick={savePreset}>{l('Saqlash', 'Сохранить', 'Save')}</Button>
        {presets.filter(p => available?.includes(String(p.code))).map(p => <Chip key={String(p.name)} label={String(p.name)} onClick={() => { setCode(String(p.code)); setF(p.filters as Record<string, string>); }} onDelete={() => removePreset(String(p.name))} />)}
      </Stack>
    </Stack></Panel>
    {result && <TablePanel><Table size="small">
      <TableHead><TableRow>{result.columns.map(c => <TableCell key={c.key} align={['number', 'money', 'percent'].includes(c.type) ? 'right' : 'left'}>{title(c)}</TableCell>)}</TableRow></TableHead>
      <TableBody>
        {result.rows.length === 0 && <TableRow><TableCell colSpan={result.columns.length}>{l('Ma’lumot yo‘q', 'Нет данных', 'No data')}</TableCell></TableRow>}
        {result.rows.map((r, i) => <TableRow key={i}>{result.columns.map(c => <TableCell key={c.key} align={['number', 'money', 'percent'].includes(c.type) ? 'right' : 'left'}>{cell(c, r[c.key])}</TableCell>)}</TableRow>)}
        {totals && Object.keys(totals).length > 0 && result.rows.length > 0 && <TableRow>{result.columns.map((c, i) => <TableCell key={c.key} align={['number', 'money', 'percent'].includes(c.type) ? 'right' : 'left'} sx={{ fontWeight: 700 }}>{i === 0 ? l('Jami', 'Итого', 'Total') : c.sum ? cell(c, totals[c.key]) : ''}</TableCell>)}</TableRow>}
      </TableBody></Table></TablePanel>}
  </>;
}
