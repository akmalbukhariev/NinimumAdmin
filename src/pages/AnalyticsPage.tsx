import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart } from 'recharts';
import { TextField } from '../components/AdminField';
import { PageTitle, Panel, TableScroll, useL, ErrorNotice } from '../components/AdminCommon';
import { useColumns } from '../components/ColumnSettings';
import { useAuth } from '../auth/AuthProvider';
import { apiRequest } from '../api/client';
import { errorText } from '../api/errorText';
import type { Row } from '../api/managementApi';

/**
 * "Hisobot" (owner request 2026-11-27): the whole business for a period on one page — totals with the change
 * against the previous period, charts by day/week/month/year, customers and staff, every employee's tasks and
 * money, expenses by type and income by source; everything downloads as one Excel file.
 * Server: GET /admin/reports/overview (BusinessOverview). Parts the user may not see are left out by the server.
 */
type L = ReturnType<typeof useL>;
type Preset = 'today' | 'week' | 'month' | 'year' | 'custom';
type Group = 'day' | 'week' | 'month' | 'year';
const RED = '#E8453C', INK = '#2D3142', GREEN = '#2E9E5B', AMBER = '#F7A928', BLUE = '#3D7CF4', VIOLET = '#8B5CF6';
const PIE = [RED, INK, AMBER, BLUE, GREEN, VIOLET, '#EC4899', '#14B8A6', '#94A3B8'];

const tashkentToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
function range(preset: Preset): [string, string] {
  const today = tashkentToday(), t = parse(today);
  if (preset === 'today') return [today, today];
  if (preset === 'week') { const back = (t.getUTCDay() + 6) % 7; return [iso(new Date(t.getTime() - back * 86400000)), today]; }
  if (preset === 'year') return [`${today.slice(0, 4)}-01-01`, today];
  return [`${today.slice(0, 8)}01`, today];
}
const days = (from: string, to: string) => Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000) + 1;
const autoGroup = (from: string, to: string): Group => { const n = days(from, to); return n <= 62 ? 'day' : n <= 200 ? 'week' : n <= 800 ? 'month' : 'year'; };
const num = (v: unknown) => Number(v ?? 0);
const fmt = (v: unknown) => new Intl.NumberFormat('ru-RU').format(Math.round(num(v)));
const som = (v: unknown) => `${fmt(v)} so‘m`;
const short = (v: number) => Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)} mln` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)} ming` : String(Math.round(v));
const dmy = (s: unknown) => { const [y, m, d] = String(s || '').slice(0, 10).split('-'); return d ? `${d}.${m}.${y}` : '—'; };
function periodLabel(period: string, group: Group, l: L) {
  const [y, m, d] = period.split('-');
  if (group === 'year') return y;
  if (group === 'month') return `${[l('Yan', 'Янв', 'Jan'), l('Fev', 'Фев', 'Feb'), l('Mar', 'Мар', 'Mar'), l('Apr', 'Апр', 'Apr'), l('May', 'Май', 'May'), l('Iyun', 'Июн', 'Jun'), l('Iyul', 'Июл', 'Jul'), l('Avg', 'Авг', 'Aug'), l('Sen', 'Сен', 'Sep'), l('Okt', 'Окт', 'Oct'), l('Noy', 'Ноя', 'Nov'), l('Dek', 'Дек', 'Dec')][Number(m) - 1]} ${y}`;
  return `${d}.${m}`;
}
const typeLabel = (type: unknown, l: L) => type === 'COURIER' ? l('Kuryer', 'Курьер', 'Courier') : type === 'WAREHOUSE' ? l('Omborchi', 'Кладовщик', 'Warehouse') : l('Administrator', 'Администратор', 'Administrator');
const statusLabel = (s: unknown, l: L) => s === 'ACTIVE' ? l('Faol', 'Активен', 'Active') : l('Nofaol', 'Неактивен', 'Inactive');

export default function AnalyticsPage() {
  const l = useL(), { accessToken } = useAuth();
  const [preset, setPreset] = useState<Preset>('month');
  const [[from, to], setRange] = useState<[string, string]>(() => range('month'));
  const [group, setGroup] = useState<Group>('day');
  const [data, setData] = useState<Row | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
  const [staffTab, setStaffTab] = useState<'ALL' | 'COURIER' | 'WAREHOUSE' | 'ADMIN'>('ALL');
  // Owner request 2026-11-27: the Hisobot menu lists every report; ?view= picks which part of this page to show.
  const [query] = useSearchParams();
  const view = VIEWS[query.get('view') || ''] ? String(query.get('view')) : 'all';
  const show = (part: Part) => VIEWS[view].parts.includes(part);
  useEffect(() => { setStaffTab(view === 'couriers' ? 'COURIER' : view === 'warehouse' ? 'WAREHOUSE' : view === 'admins' ? 'ADMIN' : 'ALL'); }, [view]);

  const load = useCallback(async (f = from, t = to, g = group) => {
    if (!accessToken) return;
    setLoading(true); setError(null);
    try { setData((await apiRequest<Row>(`/ninimum/api/v1/admin/reports/overview?from=${f}&to=${t}&group=${g}`, { token: accessToken })).resultData); }
    // An older server answers this address as an unknown report (WAREHOUSE_NOT_FOUND): say so plainly.
    catch (e) { setError((e as { resultCode?: string })?.resultCode === 'WAREHOUSE_NOT_FOUND' ? l('Server hali yangilanmagan: bu hisobot yangi backend o‘rnatilgandan keyin ishlaydi.', 'Сервер ещё не обновлён: отчёт заработает после установки нового backend.', 'The server is not updated yet: this report works after the new backend is installed.') : errorText(e, l)); } finally { setLoading(false); }
  }, [accessToken, from, to, group]);
  useEffect(() => { void load(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (p: Preset) => {
    if (!p) return; setPreset(p);
    if (p === 'custom') return;
    const [f, t] = range(p), g = p === 'year' ? 'month' : 'day';
    setRange([f, t]); setGroup(g); void load(f, t, g);
  };

  const totals = (data?.totals as Row) || {}, previous = (data?.previous as Row) || {};
  const money = Boolean(data?.can_money);
  const g = (data?.group as Group) || group;
  const series = useMemo(() => ((data?.series as Row[]) || []).map(r => ({ ...r, period: String(r.period), orders: num(r.orders), delivered: num(r.delivered), cancelled: num(r.cancelled), new_customers: num(r.new_customers), label: periodLabel(String(r.period), g, l), sales: num(r.sales), expenses: num(r.expenses), profit: num(r.profit), cost: num(r.cost) })), [data, g, l]);
  const employees = (data?.employees as Row[]) || [];
  const shownStaff = employees.filter(e => staffTab === 'ALL' || e.type === staffTab);
  const users = (data?.users as Row) || {};

  const staffCols = useColumns('analytics-staff', [
    { key: 'name', label: l('Xodim', 'Сотрудник', 'Employee'), fixed: true },
    { key: 'type', label: l('Turi', 'Тип', 'Type') },
    { key: 'status', label: l('Holat', 'Статус', 'Status') },
    { key: 'assigned', label: l('Berilgan', 'Назначено', 'Assigned') },
    { key: 'completed', label: l('Bajarilgan', 'Выполнено', 'Completed') },
    { key: 'failed', label: l('Bajarilmagan', 'Не выполнено', 'Failed') },
    { key: 'pending', label: l('Kutilmoqda', 'В ожидании', 'Pending') },
    { key: 'completion_percent', label: l('Bajarilish %', 'Выполнение %', 'Done %') },
    { key: 'avg_minutes', label: l('O‘rtacha vaqt (daq.)', 'Среднее время (мин)', 'Avg time (min)') },
    { key: 'income', label: l('Tushum', 'Выручка', 'Income') },
    { key: 'expenses', label: l('Xarajat', 'Расход', 'Expenses') },
  ]);
  const staffColumns = staffCols.visible.filter(c => money || !['income', 'expenses'].includes(c.key));

  const exportExcel = async () => {
    if (!data) return;
    try {
      const { Workbook } = await import('exceljs'); const book = new Workbook();
      const sheet = (name: string, head: string[], rows: unknown[][], widths?: number[]) => {
        const s = book.addWorksheet(name.slice(0, 31));
        s.addRow([`${l('Davr', 'Период', 'Period')}: ${dmy(data.from)} – ${dmy(data.to)}`]).font = { bold: true };
        const h = s.addRow(head); h.font = { bold: true }; h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FB' } };
        rows.forEach(r => s.addRow(r));
        head.forEach((_, i) => { s.getColumn(i + 1).width = widths?.[i] ?? (i === 0 ? 30 : 16); });
        s.views = [{ state: 'frozen', ySplit: 2 }];
        return s;
      };
      const kpi = KPIS(l).filter(k => totals[k.key] !== undefined);
      sheet(l('Umumiy', 'Итоги', 'Summary'), [l('Ko‘rsatkich', 'Показатель', 'Metric'), l('Davr', 'Период', 'Period'), l('Oldingi davr', 'Прошлый период', 'Previous period')],
        kpi.map(k => [k.label, num(totals[k.key]), num(previous[k.key])]), [36, 20, 20]);
      const sCols: [string, string][] = [['orders', l('Buyurtmalar', 'Заказы', 'Orders')], ['delivered', l('Yetkazildi', 'Доставлено', 'Delivered')], ['cancelled', l('Bekor', 'Отменено', 'Cancelled')], ['new_customers', l('Yangi mijozlar', 'Новые клиенты', 'New customers')],
        ...(money ? [['sales', l('Sotuv', 'Продажи', 'Sales')], ['cost', l('Tannarx', 'Себестоимость', 'Cost')], ['expenses', l('Xarajatlar', 'Расходы', 'Expenses')], ['other_income', l('Boshqa kirim', 'Прочий доход', 'Other income')], ['losses', l('Yo‘qotishlar', 'Потери', 'Losses')], ['profit', l('Foyda', 'Прибыль', 'Profit')]] as [string, string][] : [])];
      sheet(l('Davrlar', 'По периодам', 'By period'), [l('Davr', 'Период', 'Period'), ...sCols.map(c => c[1])], ((data.series as Row[]) || []).map(r => [periodLabel(String(r.period), g, l), ...sCols.map(c => num(r[c[0]]))]));
      if (employees.length) sheet(l('Xodimlar', 'Сотрудники', 'Employees'), staffColumns.map(c => c.label), employees.map(e => staffColumns.map(c => c.key === 'type' ? typeLabel(e.type, l) : c.key === 'status' ? statusLabel(e.status, l) : c.key === 'name' ? `${e.name || ''} (${e.code})` : e[c.key] == null ? null : Number(e[c.key]))));
      if (money) {
        sheet(l('Xarajatlar', 'Расходы', 'Expenses'), [l('Xarajat turi', 'Тип расхода', 'Expense type'), l('Summa', 'Сумма', 'Amount'), l('Hujjatlar', 'Документов', 'Documents')], ((data.expenses_by_type as Row[]) || []).map(r => [r.name, num(r.amount), num(r.documents)]));
        sheet(l('Daromad', 'Доходы', 'Income'), [l('Manba', 'Источник', 'Source'), l('Summa', 'Сумма', 'Amount'), l('Soni', 'Кол-во', 'Count')], ((data.income_by_source as Row[]) || []).map(r => [r.name === 'SALES' ? l('Sotuv (yetkazilgan buyurtmalar)', 'Продажи (доставленные заказы)', 'Sales (delivered orders)') : r.name, num(r.amount), num(r.documents)]));
      }
      if (Object.keys(users).length) sheet(l('Foydalanuvchilar', 'Пользователи', 'Users'), [l('Guruh', 'Группа', 'Group'), l('Soni', 'Кол-во', 'Count')], USERS(l).filter(u => users[u.key] !== undefined).map(u => [u.label, num(users[u.key])]), [36, 14]);
      const blob = new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ninimum-hisobot-${data.from}-${data.to}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { setError(l('Excel faylini yaratib bo‘lmadi.', 'Не удалось создать файл Excel.', 'Could not create the Excel file.')); }
  };

  return <>
    <PageTitle title={l(...VIEWS[view].title)} />
    <ErrorNotice message={error} sx={{ mb: 2 }} onClose={() => setError(null)} />

    <Panel sx={{ p: 2, mb: 2.5 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ alignItems: { lg: 'center' }, flexWrap: 'wrap' }} useFlexGap>
        <ToggleButtonGroup exclusive size="small" color="primary" value={preset} onChange={(_, v) => choose(v)} sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { px: 1.75, fontWeight: 700, textTransform: 'none' } }}>
          <ToggleButton value="today">{l('Bugun', 'Сегодня', 'Today')}</ToggleButton>
          <ToggleButton value="week">{l('Hafta', 'Неделя', 'Week')}</ToggleButton>
          <ToggleButton value="month">{l('Oy', 'Месяц', 'Month')}</ToggleButton>
          <ToggleButton value="year">{l('Yil', 'Год', 'Year')}</ToggleButton>
          <ToggleButton value="custom">{l('Tanlash', 'Выбрать', 'Custom')}</ToggleButton>
        </ToggleButtonGroup>
        <TextField type="date" size="small" label={l('Dan', 'С', 'From')} value={from} onChange={e => { setPreset('custom'); setRange([e.target.value, to]); if (e.target.value && to) setGroup(autoGroup(e.target.value, to)); }} sx={{ width: 170 }} />
        <TextField type="date" size="small" label={l('Gacha', 'По', 'To')} value={to} onChange={e => { setPreset('custom'); setRange([from, e.target.value]); if (from && e.target.value) setGroup(autoGroup(from, e.target.value)); }} sx={{ width: 170 }} />
        <TextField select size="small" label={l('Guruhlash', 'Группировка', 'Group by')} value={group} onChange={e => setGroup(e.target.value as Group)} sx={{ width: 150 }}>
          <MenuItem value="day">{l('Kun', 'День', 'Day')}</MenuItem><MenuItem value="week">{l('Hafta', 'Неделя', 'Week')}</MenuItem>
          <MenuItem value="month">{l('Oy', 'Месяц', 'Month')}</MenuItem><MenuItem value="year">{l('Yil', 'Год', 'Year')}</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshRounded />} disabled={loading || !from || !to} onClick={() => void load()}>{l('Ko‘rsatish', 'Показать', 'Show')}</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" color="secondary" startIcon={<FileDownloadRounded />} disabled={!data || loading} onClick={() => void exportExcel()} sx={{ borderColor: 'divider' }}>{l('Excelga yuklash', 'Скачать Excel', 'Download Excel')}</Button>
      </Stack>
      {data && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
        {l('Davr', 'Период', 'Period')}: <b>{dmy(data.from)} – {dmy(data.to)}</b> · {l('taqqoslash', 'сравнение с', 'compared with')} {dmy(data.previous_from)} – {dmy(data.previous_to)}
      </Typography>}
    </Panel>

    {!data && loading && <Box sx={{ py: 10, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>}
    {data && <Box sx={{ opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>
      {/* Totals */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2.5 }}>
        {KPIS(l).filter(k => totals[k.key] !== undefined && show(KPI_PART[k.key] || 'kpiOrders')).map(k => <Kpi key={k.key} label={k.label} value={k.money ? som(totals[k.key]) : k.percent ? (totals[k.key] == null ? '—' : `${totals[k.key]}%`) : fmt(totals[k.key])}
          now={num(totals[k.key])} before={num(previous[k.key])} accent={k.color} lowerIsBetter={k.lowerIsBetter} percent={k.percent} />)}
      </Box>
      {money && (num(totals.losses) > 0) && <Alert severity="info" sx={{ mb: 2 }}>{l('Foyda = sotuv − tannarx − xarajatlar − yo‘qotishlar (spisaniya va kamomad). Boshqa kirimlar alohida ko‘rsatiladi.', 'Прибыль = продажи − себестоимость − расходы − потери (списания и недостачи). Прочие доходы показаны отдельно.', 'Profit = sales − cost − expenses − losses (write-offs and shortages). Other income is shown separately.')}</Alert>}

      {/* Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: money && show('chartMoney') && show('chartExpenses') ? '2fr 1fr' : '1fr' }, gap: 2, mb: 2.5, '&:empty': { display: 'none' } }}>
        {money && show('chartMoney') && <ChartCard title={l('Sotuv, xarajat va foyda', 'Продажи, расходы и прибыль', 'Sales, expenses and profit')}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#EEF0F4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={8} />
              <YAxis tickFormatter={short} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v: number) => som(v)} />
              <Legend />
              <Bar dataKey="sales" name={l('Sotuv', 'Продажи', 'Sales')} fill={RED} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="expenses" name={l('Xarajatlar', 'Расходы', 'Expenses')} fill={INK} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Line dataKey="profit" name={l('Foyda', 'Прибыль', 'Profit')} stroke={GREEN} strokeWidth={2.5} dot={false} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>}
        {money && show('chartExpenses') && <ChartCard title={l('Xarajatlar turlari bo‘yicha', 'Расходы по типам', 'Expenses by type')}>
          {((data.expenses_by_type as Row[]) || []).length ? <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={((data.expenses_by_type as Row[]) || []).map(r => ({ name: String(r.name), value: num(r.amount) }))} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={2}>
                {((data.expenses_by_type as Row[]) || []).map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => som(v)} /><Legend />
            </PieChart>
          </ResponsiveContainer> : <Empty l={l} />}
        </ChartCard>}
        {show('chartOrders') && <ChartCard title={l('Buyurtmalar', 'Заказы', 'Orders')}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#EEF0F4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip /><Legend />
              <Area dataKey="orders" name={l('Tushgan', 'Поступило', 'Placed')} fill="#FFECEA" stroke={RED} type="monotone" />
              <Bar dataKey="delivered" name={l('Yetkazildi', 'Доставлено', 'Delivered')} fill={GREEN} radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="cancelled" name={l('Bekor qilindi', 'Отменено', 'Cancelled')} fill={AMBER} radius={[6, 6, 0, 0]} maxBarSize={28} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>}
        {Object.keys(users).length > 0 && show('users') && <ChartCard title={l('Foydalanuvchilar', 'Пользователи', 'Users')}>
          <Stack spacing={1}>
            {USERS(l).filter(u => users[u.key] !== undefined).map(u => <Box key={u.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.6, borderBottom: '1px dashed', borderColor: 'divider' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: u.color }} />
              <Typography sx={{ flex: 1, fontSize: 14 }}>{u.label}</Typography>
              <Typography sx={{ fontWeight: 800 }}>{fmt(users[u.key])}</Typography>
            </Box>)}
          </Stack>
        </ChartCard>}
      </Box>

      {/* Employees */}
      {data.employees !== undefined && show('staff') && <Panel sx={{ mb: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ px: 2, pt: 1.5, alignItems: { md: 'center' } }}>
          <Typography sx={{ fontWeight: 800, fontSize: 17, flex: 1 }}>{l('Xodimlar samaradorligi', 'Эффективность сотрудников', 'Employee performance')}</Typography>
          {staffCols.settings}
        </Stack>
        <Tabs value={staffTab} onChange={(_, v) => setStaffTab(v)} sx={{ px: 1 }} variant="scrollable">
          <Tab value="ALL" label={`${l('Hammasi', 'Все', 'All')} (${employees.length})`} />
          <Tab value="COURIER" label={`${l('Kuryerlar', 'Курьеры', 'Couriers')} (${employees.filter(e => e.type === 'COURIER').length})`} />
          <Tab value="WAREHOUSE" label={`${l('Omborchilar', 'Кладовщики', 'Warehouse')} (${employees.filter(e => e.type === 'WAREHOUSE').length})`} />
          <Tab value="ADMIN" label={`${l('Administratorlar', 'Администраторы', 'Administrators')} (${employees.filter(e => e.type === 'ADMIN').length})`} />
        </Tabs>
        {shownStaff.some(e => num(e.assigned) + num(e.completed) > 0) && <Box sx={{ px: 2, pt: 1 }}>
          <ResponsiveContainer width="100%" height={Math.min(360, 60 + shownStaff.filter(e => num(e.assigned) + num(e.completed) > 0).slice(0, 12).length * 30)}>
            <BarChart layout="vertical" data={shownStaff.filter(e => num(e.assigned) + num(e.completed) > 0).sort((a, b) => num(b.completed) - num(a.completed)).slice(0, 12).map(e => ({ name: String(e.name || e.code), completed: num(e.completed), pending: num(e.pending), failed: num(e.failed) }))} margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="#EEF0F4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
              <Tooltip /><Legend />
              <Bar dataKey="completed" stackId="a" name={l('Bajarilgan', 'Выполнено', 'Completed')} fill={GREEN} />
              <Bar dataKey="pending" stackId="a" name={l('Kutilmoqda', 'В ожидании', 'Pending')} fill={AMBER} />
              <Bar dataKey="failed" stackId="a" name={l('Bajarilmagan', 'Не выполнено', 'Failed')} fill={RED} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>}
        <TableScroll><Table size="small">
          <TableHead><TableRow>{staffColumns.map(c => <TableCell key={c.key} align={c.key === 'name' || c.key === 'type' || c.key === 'status' ? undefined : 'right'}>{c.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {shownStaff.map(e => <TableRow key={`${e.type}-${e.id}`}>{staffColumns.map(c => <TableCell key={c.key} align={c.key === 'name' || c.key === 'type' || c.key === 'status' ? undefined : 'right'}>{
              c.key === 'name' ? <><b>{String(e.name || '—')}</b><Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{String(e.code)}</Typography></>
                : c.key === 'type' ? typeLabel(e.type, l)
                : c.key === 'status' ? <Chip size="small" label={statusLabel(e.status, l)} color={e.status === 'ACTIVE' ? 'success' : 'default'} variant="outlined" />
                : c.key === 'income' || c.key === 'expenses' ? (num(e[c.key]) ? som(e[c.key]) : '—')
                : c.key === 'completion_percent' ? (e.completion_percent == null ? '—' : `${e.completion_percent}%`)
                : c.key === 'avg_minutes' ? (e.avg_minutes == null ? '—' : String(e.avg_minutes))
                : fmt(e[c.key])}</TableCell>)}</TableRow>)}
            {!shownStaff.length && <TableRow><TableCell colSpan={staffColumns.length}><Empty l={l} /></TableCell></TableRow>}
          </TableBody>
        </Table></TableScroll>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2, py: 1.25 }}>
          {l('Vazifalar: kuryer — yetkazishlar; omborchi — qadoqlash; administrator — kirim va inventar hujjatlari. Tushum: kuryer yetkazgan / omborchi qadoqlagan buyurtmalar summasi, administrator kiritgan kirim hujjatlari. "Kutilmoqda" — hozir ochiq vazifalar.',
            'Задачи: курьер — доставки; кладовщик — сборка; администратор — приходы и документы инвентаризации. Выручка: сумма доставленных / собранных заказов, у администратора — внесённые доходы. «В ожидании» — открытые сейчас задачи.',
            'Tasks: courier — deliveries; warehouse — packing; administrator — receipts and inventory documents. Income: value of orders delivered / packed; for administrators, income documents they entered. "Pending" = tasks open now.')}
        </Typography>
      </Panel>}

      {/* Money tables */}
      {money && show('moneyTables') && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
        <MoneyTable title={l('Xarajatlar turlari bo‘yicha', 'Расходы по типам', 'Expenses by type')} l={l} rows={((data.expenses_by_type as Row[]) || []).map(r => [String(r.name), num(r.documents), num(r.amount)])} />
        <MoneyTable title={l('Daromad manbalari', 'Источники дохода', 'Income sources')} l={l} rows={((data.income_by_source as Row[]) || []).map(r => [r.name === 'SALES' ? l('Sotuv (yetkazilgan buyurtmalar)', 'Продажи (доставленные заказы)', 'Sales (delivered orders)') : String(r.name), num(r.documents), num(r.amount)])} />
      </Box>}

      {/* Period table */}
      {show('periodTable') && <Panel>
        <Typography sx={{ fontWeight: 800, fontSize: 17, px: 2, pt: 1.5, pb: 1 }}>{l('Davrlar bo‘yicha', 'По периодам', 'By period')}</Typography>
        <TableScroll><Table size="small">
          <TableHead><TableRow>
            <TableCell>{l('Davr', 'Период', 'Period')}</TableCell>
            <TableCell align="right">{l('Buyurtmalar', 'Заказы', 'Orders')}</TableCell><TableCell align="right">{l('Yetkazildi', 'Доставлено', 'Delivered')}</TableCell>
            <TableCell align="right">{l('Bekor', 'Отменено', 'Cancelled')}</TableCell><TableCell align="right">{l('Yangi mijozlar', 'Новые клиенты', 'New customers')}</TableCell>
            {money && <><TableCell align="right">{l('Sotuv', 'Продажи', 'Sales')}</TableCell><TableCell align="right">{l('Xarajatlar', 'Расходы', 'Expenses')}</TableCell><TableCell align="right">{l('Foyda', 'Прибыль', 'Profit')}</TableCell></>}
          </TableRow></TableHead>
          <TableBody>
            {series.map(r => <TableRow key={String(r.period)}>
              <TableCell>{g === 'week' ? `${dmy(r.period)} ${l('dan', 'с', 'from')}` : r.label}</TableCell>
              <TableCell align="right">{fmt(r.orders)}</TableCell><TableCell align="right">{fmt(r.delivered)}</TableCell><TableCell align="right">{fmt(r.cancelled)}</TableCell><TableCell align="right">{fmt(r.new_customers)}</TableCell>
              {money && <><TableCell align="right">{fmt(r.sales)}</TableCell><TableCell align="right">{fmt(r.expenses)}</TableCell><TableCell align="right" sx={{ color: r.profit < 0 ? 'error.main' : 'success.main', fontWeight: 700 }}>{fmt(r.profit)}</TableCell></>}
            </TableRow>)}
            <TableRow sx={{ '& td': { fontWeight: 800, bgcolor: '#FFF3F2' } }}>
              <TableCell>{l('Jami', 'Итого', 'Total')}</TableCell>
              <TableCell align="right">{fmt(totals.orders)}</TableCell><TableCell align="right">{fmt(totals.delivered)}</TableCell><TableCell align="right">{fmt(totals.cancelled)}</TableCell><TableCell align="right">{fmt(totals.new_customers)}</TableCell>
              {money && <><TableCell align="right">{fmt(totals.sales)}</TableCell><TableCell align="right">{fmt(totals.expenses)}</TableCell><TableCell align="right">{fmt(totals.profit)}</TableCell></>}
            </TableRow>
          </TableBody>
        </Table></TableScroll>
      </Panel>}
    </Box>}
  </>;
}

type Part = 'kpiMoney' | 'kpiOrders' | 'kpiUsers' | 'chartMoney' | 'chartExpenses' | 'chartOrders' | 'users' | 'staff' | 'moneyTables' | 'periodTable';
const ALL_PARTS: Part[] = ['kpiMoney', 'kpiOrders', 'kpiUsers', 'chartMoney', 'chartExpenses', 'chartOrders', 'users', 'staff', 'moneyTables', 'periodTable'];
const STAFF_PARTS: Part[] = ['staff'];
/** One report per Hisobot menu item; the left menu links to /analytics?view=<key>. */
export const VIEWS: Record<string, { title: [string, string, string]; parts: Part[] }> = {
  all: { title: ['Umumiy hisobot', 'Общий отчёт', 'Overview'], parts: ALL_PARTS },
  money: { title: ['Tushum va foyda', 'Выручка и прибыль', 'Income and profit'], parts: ['kpiMoney', 'chartMoney', 'chartExpenses', 'moneyTables', 'periodTable'] },
  expenses: { title: ['Xarajatlar', 'Расходы', 'Expenses'], parts: ['kpiMoney', 'chartExpenses', 'moneyTables'] },
  orders: { title: ['Buyurtmalar hisoboti', 'Отчёт по заказам', 'Orders report'], parts: ['kpiOrders', 'chartOrders', 'periodTable'] },
  users: { title: ['Mijozlar va foydalanuvchilar', 'Клиенты и пользователи', 'Customers and users'], parts: ['kpiUsers', 'users', 'periodTable'] },
  staff: { title: ['Xodimlar samaradorligi', 'Эффективность сотрудников', 'Employee performance'], parts: [...STAFF_PARTS, 'users'] },
  couriers: { title: ['Kuryerlar ishi', 'Работа курьеров', 'Couriers'], parts: STAFF_PARTS },
  warehouse: { title: ['Omborchilar ishi', 'Работа кладовщиков', 'Warehouse workers'], parts: STAFF_PARTS },
  admins: { title: ['Administratorlar ishi', 'Работа администраторов', 'Administrators'], parts: STAFF_PARTS },
};
const KPI_PART: Record<string, Part> = {
  sales: 'kpiMoney', profit: 'kpiMoney', expenses: 'kpiMoney', margin_percent: 'kpiMoney', gross_profit: 'kpiMoney', cost: 'kpiMoney', losses: 'kpiMoney', other_income: 'kpiMoney', average_order: 'kpiMoney',
  orders: 'kpiOrders', paid_orders: 'kpiOrders', delivered: 'kpiOrders', cancelled: 'kpiOrders', new_customers: 'kpiUsers', buyers: 'kpiUsers',
};

function KPIS(l: L) {
  return [
    { key: 'sales', label: l('Sotuv (tushum)', 'Продажи (выручка)', 'Sales'), money: true, color: RED },
    { key: 'profit', label: l('Sof foyda', 'Чистая прибыль', 'Net profit'), money: true, color: GREEN },
    { key: 'expenses', label: l('Xarajatlar', 'Расходы', 'Expenses'), money: true, color: INK, lowerIsBetter: true },
    { key: 'margin_percent', label: l('Marja', 'Маржа', 'Margin'), percent: true, color: VIOLET },
    { key: 'gross_profit', label: l('Yalpi foyda', 'Валовая прибыль', 'Gross profit'), money: true, color: GREEN },
    { key: 'cost', label: l('Tannarx', 'Себестоимость', 'Cost of goods'), money: true, color: INK, lowerIsBetter: true },
    { key: 'losses', label: l('Yo‘qotishlar', 'Потери', 'Losses'), money: true, color: AMBER, lowerIsBetter: true },
    { key: 'other_income', label: l('Boshqa kirim', 'Прочий доход', 'Other income'), money: true, color: BLUE },
    { key: 'average_order', label: l('O‘rtacha buyurtma', 'Средний чек', 'Average order'), money: true, color: BLUE },
    { key: 'orders', label: l('Buyurtmalar', 'Заказы', 'Orders'), color: RED },
    { key: 'paid_orders', label: l('To‘langan buyurtmalar', 'Оплаченные заказы', 'Paid orders'), color: RED },
    { key: 'delivered', label: l('Yetkazildi', 'Доставлено', 'Delivered'), color: GREEN },
    { key: 'cancelled', label: l('Bekor qilindi', 'Отменено', 'Cancelled'), color: AMBER, lowerIsBetter: true },
    { key: 'new_customers', label: l('Yangi mijozlar', 'Новые клиенты', 'New customers'), color: BLUE },
    { key: 'buyers', label: l('Xarid qilgan mijozlar', 'Покупавшие клиенты', 'Buying customers'), color: VIOLET },
  ] as { key: string; label: string; money?: boolean; percent?: boolean; color: string; lowerIsBetter?: boolean }[];
}

function USERS(l: L) {
  return [
    { key: 'customers_active', label: l('Faol mijozlar', 'Активные клиенты', 'Active customers'), color: GREEN },
    { key: 'customers_inactive', label: l('Bloklangan / nofaol mijozlar', 'Заблокированные / неактивные', 'Blocked / inactive customers'), color: AMBER },
    { key: 'customers_deleted', label: l('O‘chirilgan hisoblar', 'Удалённые аккаунты', 'Deleted accounts'), color: '#94A3B8' },
    { key: 'customers_buying_30d', label: l('Oxirgi 30 kunda xarid qilganlar', 'Покупали за 30 дней', 'Bought in the last 30 days'), color: RED },
    { key: 'couriers_active', label: l('Faol kuryerlar', 'Активные курьеры', 'Active couriers'), color: GREEN },
    { key: 'couriers_online', label: l('Hozir ishda (kuryer)', 'Сейчас на смене (курьеры)', 'On shift now (couriers)'), color: BLUE },
    { key: 'couriers_inactive', label: l('Nofaol kuryerlar', 'Неактивные курьеры', 'Inactive couriers'), color: '#94A3B8' },
    { key: 'warehouse_active', label: l('Faol omborchilar', 'Активные кладовщики', 'Active warehouse workers'), color: GREEN },
    { key: 'warehouse_inactive', label: l('Nofaol omborchilar', 'Неактивные кладовщики', 'Inactive warehouse workers'), color: '#94A3B8' },
    { key: 'admins_active', label: l('Faol administratorlar', 'Активные администраторы', 'Active administrators'), color: GREEN },
    { key: 'admins_inactive', label: l('Nofaol administratorlar', 'Неактивные администраторы', 'Inactive administrators'), color: '#94A3B8' },
  ];
}

function Kpi({ label, value, now, before, accent, lowerIsBetter, percent }: { label: string; value: string; now: number; before: number; accent: string; lowerIsBetter?: boolean; percent?: boolean }) {
  const l = useL();
  const change = percent ? now - before : before === 0 ? (now === 0 ? 0 : null) : ((now - before) / Math.abs(before)) * 100;
  const good = change == null ? true : lowerIsBetter ? change <= 0 : change >= 0;
  return <Panel sx={{ p: 2, position: 'relative', '&::before': { content: '""', position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: 4, bgcolor: accent } }}>
    <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: { xs: 19, md: 23 }, fontWeight: 800, mt: 0.5, letterSpacing: -0.3 }}>{value}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: change == null || change === 0 ? 'text.secondary' : good ? 'success.main' : 'error.main' }}>
      {change != null && change !== 0 && (change > 0 ? <TrendingUpRounded sx={{ fontSize: 18 }} /> : <TrendingDownRounded sx={{ fontSize: 18 }} />)}
      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
        {change == null ? l('oldin yo‘q edi', 'раньше не было', 'new') : change === 0 ? l('o‘zgarishsiz', 'без изменений', 'no change') : `${change > 0 ? '+' : ''}${change.toFixed(1)}${percent ? ' p.p.' : '%'}`}
      </Typography>
    </Box>
  </Panel>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Panel sx={{ p: 2 }}><Typography sx={{ fontWeight: 800, fontSize: 16, mb: 1.5 }}>{title}</Typography>{children}</Panel>;
}

function Empty({ l }: { l: L }) {
  return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{l('Bu davrda ma’lumot yo‘q', 'Нет данных за период', 'No data for this period')}</Typography>;
}

function MoneyTable({ title, rows, l }: { title: string; rows: [string, number, number][]; l: L }) {
  const total = rows.reduce((s, r) => s + r[2], 0);
  return <Panel>
    <Typography sx={{ fontWeight: 800, fontSize: 16, px: 2, pt: 1.5, pb: 1 }}>{title}</Typography>
    <Table size="small"><TableHead><TableRow><TableCell>{l('Nomi', 'Название', 'Name')}</TableCell><TableCell align="right">{l('Soni', 'Кол-во', 'Count')}</TableCell><TableCell align="right">{l('Summa', 'Сумма', 'Amount')}</TableCell><TableCell align="right">%</TableCell></TableRow></TableHead>
      <TableBody>
        {rows.map((r, i) => <TableRow key={i}><TableCell>{r[0]}</TableCell><TableCell align="right">{fmt(r[1])}</TableCell><TableCell align="right">{som(r[2])}</TableCell><TableCell align="right">{total ? `${(r[2] * 100 / total).toFixed(1)}%` : '—'}</TableCell></TableRow>)}
        {!rows.length && <TableRow><TableCell colSpan={4}><Empty l={l} /></TableCell></TableRow>}
        {rows.length > 0 && <TableRow sx={{ '& td': { fontWeight: 800 } }}><TableCell>{l('Jami', 'Итого', 'Total')}</TableCell><TableCell align="right">{fmt(rows.reduce((s, r) => s + r[1], 0))}</TableCell><TableCell align="right">{som(total)}</TableCell><TableCell /></TableRow>}
      </TableBody></Table>
  </Panel>;
}
