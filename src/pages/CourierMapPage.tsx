import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Stack, Tab, Tabs, Typography } from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { TextField } from '../components/AdminField';
import { PageTitle, Panel, dateTime, useL } from '../components/AdminCommon';
import { CourierMap, ago, escapeHtml, type MapLine, type MapMarker } from '../components/CourierMap';
import { apiRequest } from '../api/client';
import { errorText } from '../api/errorText';
import { useAuth } from '../auth/AuthProvider';
import type { Row } from '../api/managementApi';

// Courier GPS V1b: live courier map and one courier's day route.
const base = '/ninimum/api/v1/admin/management/delivery/tracking';
const FRESH_MINUTES = 5;
const minutesSince = (iso: unknown) => iso ? (Date.now() - new Date(String(iso)).getTime()) / 60000 : Infinity;
const tashkentToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const actionColor: Record<string, string> = { ACCEPTED: '#6B7280', ON_THE_WAY: '#2563EB', DELIVERED: '#16A34A', FAILED: '#DC2626', PARTIAL_RETURN: '#D97706' };

export default function CourierMapPage() {
  const l = useL(), { accessToken } = useAuth();
  const [tab, setTab] = useState(0);
  const [live, setLive] = useState<Row | null>(null), [error, setError] = useState<string | null>(null);
  const loadLive = useCallback(async () => {
    try { setLive((await apiRequest<Row>(`${base}/live`, { token: accessToken! })).resultData); setError(null); }
    catch (e) { setError(errorText(e, l)); }
  }, [accessToken]);
  useEffect(() => { void loadLive(); const id = window.setInterval(() => void loadLive(), 20000); return () => window.clearInterval(id); }, [loadLive]);
  const couriers = (live?.couriers as Row[]) || [];

  const state = (c: Row) => !c.is_online ? { label: l('Ishda emas', 'Не на смене', 'Off shift'), color: '#9CA3AF', chip: 'default' as const }
    : minutesSince(c.recorded_at) <= FRESH_MINUTES ? { label: l('Faol', 'Активен', 'Active'), color: (c.orders as Row[]).length ? '#2563EB' : '#16A34A', chip: 'success' as const }
    : { label: l('Signal yo‘q', 'Нет сигнала', 'No signal'), color: '#F59E0B', chip: 'warning' as const };

  const liveMarkers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    for (const c of couriers) {
      if (c.latitude == null) continue;
      const s = state(c);
      const orders = (c.orders as Row[]).map(o => `#${escapeHtml(o.order_id)} ${escapeHtml(o.customer_name)}`).join('<br/>');
      out.push({ lat: Number(c.latitude), lon: Number(c.longitude), color: s.color, big: true, label: String(c.full_name || c.worker_code || '?').trim().slice(0, 1).toUpperCase(),
        popup: `<b>${escapeHtml(c.full_name)}</b> (${escapeHtml(c.worker_code)})<br/>${escapeHtml(s.label)} · ${escapeHtml(ago(c.recorded_at, l))}` +
          `${c.battery_pct != null ? `<br/>🔋 ${escapeHtml(c.battery_pct)}%` : ''}${c.is_mock ? `<br/><b style="color:#DC2626">${escapeHtml(l('Soxta GPS!', 'Фальшивый GPS!', 'Fake GPS!'))}</b>` : ''}${orders ? `<br/>${orders}` : ''}` });
      for (const o of c.orders as Row[]) if (o.latitude != null)
        out.push({ lat: Number(o.latitude), lon: Number(o.longitude), color: '#7C3AED', label: '●', popup: `#${escapeHtml(o.order_id)} · ${escapeHtml(o.customer_name)}<br/>${escapeHtml(o.delivery_address)}<br/>${escapeHtml(l('Kuryer', 'Курьер', 'Courier'))}: ${escapeHtml(c.full_name)}` });
    }
    return out;
  }, [live, l]);

  return <>
    <PageTitle title={l('Kuryerlar xaritasi', 'Карта курьеров', 'Courier map')} />
    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label={l('Hozir', 'Сейчас', 'Now')} /><Tab label={l('Kun yo‘li', 'Маршрут за день', 'Day route')} /></Tabs>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {live && live.available === false && <Alert severity="info" sx={{ mb: 2 }}>{l('Kuzatuv hali yoqilmagan (serverda yangilanish kerak).', 'Отслеживание ещё не включено (нужно обновление сервера).', 'Tracking is not on yet (the server needs the update).')}</Alert>}
    {tab === 0 ? <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
      <Box sx={{ flex: 1, minWidth: 0 }}><CourierMap markers={liveMarkers} height={560} /></Box>
      <Panel sx={{ p: 2, width: { lg: 340 }, flexShrink: 0, maxHeight: 560, overflowY: 'auto' }}>
        <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}><Typography sx={{ fontWeight: 800, flex: 1 }}>{l('Kuryerlar', 'Курьеры', 'Couriers')}</Typography>
          <Button size="small" startIcon={<RefreshRounded />} onClick={() => void loadLive()}>{l('Yangilash', 'Обновить', 'Refresh')}</Button></Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{l('Har 20 soniyada yangilanadi. Ko‘k — buyurtma olib ketyapti, yashil — bo‘sh, sariq — 5 daqiqadan beri signal yo‘q.', 'Обновляется каждые 20 секунд. Синий — везёт заказ, зелёный — свободен, жёлтый — нет сигнала больше 5 минут.', 'Refreshes every 20 seconds. Blue — carrying an order, green — free, yellow — no signal for 5+ minutes.')}</Typography>
        {couriers.map(c => { const s = state(c); return <Box key={String(c.id)} sx={{ py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography sx={{ fontWeight: 700, flex: 1 }}>{c.full_name}</Typography><Chip size="small" color={s.chip} label={s.label} /></Stack>
          <Typography variant="body2" color="text.secondary">{c.worker_code}{c.phone_number ? ` · ${c.phone_number}` : ''}{c.vehicle_type ? ` · ${c.vehicle_type}` : ''}</Typography>
          <Typography variant="body2" color="text.secondary">{l('Oxirgi joylashuv', 'Последнее место', 'Last position')}: {ago(c.recorded_at, l)}{c.battery_pct != null ? ` · 🔋 ${c.battery_pct}%` : ''}</Typography>
          {c.is_mock ? <Chip size="small" color="error" label={l('Soxta GPS', 'Фальшивый GPS', 'Fake GPS')} sx={{ mt: 0.5 }} /> : null}
          {(c.orders as Row[]).map(o => <Typography key={String(o.order_id)} variant="body2">#{o.order_id} · {o.customer_name} · {o.status === 'ON_THE_WAY' ? l('yo‘lda', 'в пути', 'on the way') : l('qabul qilgan', 'принял', 'accepted')}</Typography>)}
        </Box>; })}
        {!couriers.length && <Typography color="text.secondary">{l('Faol kuryer yo‘q', 'Нет активных курьеров', 'No active couriers')}</Typography>}
      </Panel>
    </Stack> : <DayRoute couriers={couriers} />}
  </>;
}

function DayRoute({ couriers }: { couriers: Row[] }) {
  const l = useL(), { accessToken } = useAuth();
  const [worker, setWorker] = useState(''), [date, setDate] = useState(tashkentToday()), [data, setData] = useState<Row | null>(null), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(false);
  useEffect(() => { if (!worker && couriers.length) setWorker(String(couriers[0].id)); }, [couriers, worker]);
  const load = useCallback(async () => {
    if (!worker || !date) return;
    setLoading(true);
    try { setData((await apiRequest<Row>(`${base}/day?worker_id=${worker}&date=${date}`, { token: accessToken! })).resultData); setError(null); }
    catch (e) { setError(errorText(e, l)); } finally { setLoading(false); }
  }, [worker, date, accessToken]);
  useEffect(() => { void load(); }, [load]);
  const { markers, lines } = useMemo(() => routeLayers(data, l), [data, l]);
  const s = (data?.summary as Row) || {};
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField select size="small" label={l('Kuryer', 'Курьер', 'Courier')} value={worker} onChange={e => setWorker(e.target.value)} sx={{ minWidth: 220 }}>
        {couriers.map(c => <MenuItem key={String(c.id)} value={String(c.id)}>{c.full_name} ({c.worker_code})</MenuItem>)}</TextField>
      <TextField type="date" size="small" label={l('Sana', 'Дата', 'Date')} value={date} onChange={e => setDate(e.target.value)} />
      <Button disabled={loading} startIcon={<RefreshRounded />} onClick={() => void load()}>{l('Ko‘rsatish', 'Показать', 'Show')}</Button>
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}
    {data && <RouteSummary summary={s} />}
    <CourierMap markers={markers} lines={lines} height={540} fitKey={`${worker}-${date}-${(data?.points as Row[])?.length || 0}`} />
    <RouteLegend />
  </Stack>;
}

/** Route line (accurate points) plus a numbered marker for each courier button press, and start/end dots. */
export function routeLayers(data: Row | null, l: (uz: string, ru: string, en: string) => string): { markers: MapMarker[]; lines: MapLine[] } {
  const points = ((data?.points as Row[]) || []).filter(p => p.acc == null || Number(p.acc) <= 100);
  const lines: MapLine[] = points.length > 1 ? [{ points: points.map(p => [Number(p.lat), Number(p.lon)]), color: '#2563EB' }] : [];
  const markers: MapMarker[] = [];
  if (points.length) {
    const first = points[0], last = points[points.length - 1];
    markers.push({ lat: Number(first.lat), lon: Number(first.lon), color: '#111827', label: 'S', popup: `${escapeHtml(l('Boshlanish', 'Начало', 'Start'))}: ${escapeHtml(dateTime(first.t))}` });
    markers.push({ lat: Number(last.lat), lon: Number(last.lon), color: '#111827', label: 'E', popup: `${escapeHtml(l('Oxirgi nuqta', 'Последняя точка', 'Last point'))}: ${escapeHtml(dateTime(last.t))}${last.battery != null ? ` · 🔋 ${escapeHtml(last.battery)}%` : ''}` });
  }
  const names: Record<string, string> = { ACCEPTED: l('Qabul qildi', 'Принял', 'Accepted'), ON_THE_WAY: l('Yo‘lga chiqdi', 'В пути', 'On the way'), DELIVERED: l('Yetkazildi', 'Доставлен', 'Delivered'), FAILED: l('Yetkazilmadi', 'Не доставлен', 'Failed'), PARTIAL_RETURN: l('Qisman qaytarish', 'Частичный возврат', 'Partial return') };
  ((data?.actions as Row[]) || []).forEach((a, i) => markers.push({ lat: Number(a.lat), lon: Number(a.lon), color: actionColor[String(a.status)] || '#6B7280', label: String(i + 1),
    popup: `<b>${escapeHtml(names[String(a.status)] || a.status)}</b> · #${escapeHtml(a.order_id)}<br/>${escapeHtml(dateTime(a.t))}${a.distance_m != null ? `<br/>${escapeHtml(l(`Mijozdan ${a.distance_m} m`, `${a.distance_m} м от клиента`, `${a.distance_m} m from the customer`))}` : ''}${a.mock ? `<br/><b style="color:#DC2626">${escapeHtml(l('Soxta GPS', 'Фальшивый GPS', 'Fake GPS'))}</b>` : ''}` }));
  const c = data?.customer_point as Row | undefined;
  if (c?.latitude != null) markers.push({ lat: Number(c.latitude), lon: Number(c.longitude), color: '#7C3AED', label: 'M', big: true, popup: escapeHtml(l('Mijoz manzili', 'Адрес клиента', 'Customer address')) });
  return { markers, lines };
}

export function RouteSummary({ summary }: { summary: Row }) {
  const l = useL();
  if (!Number(summary.points)) return <Alert severity="info">{l('Bu vaqt oralig‘ida joylashuv yozilmagan.', 'За это время нет точек.', 'No positions were recorded in this period.')}</Alert>;
  const gap = Number(summary.longest_gap_minutes || 0);
  return <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
    <Chip label={`${l('Masofa', 'Расстояние', 'Distance')}: ${summary.km} km`} />
    <Chip label={`${dateTime(summary.first)} → ${dateTime(summary.last)}`} />
    <Chip label={`${l('Nuqtalar', 'Точки', 'Points')}: ${summary.points}`} />
    <Chip color={gap >= 10 ? 'warning' : 'default'} label={`${l('Eng uzun uzilish', 'Самый долгий разрыв', 'Longest gap')}: ${gap} ${l('daqiqa', 'мин', 'min')}`} />
  </Stack>;
}

export function RouteLegend() {
  const l = useL();
  const items: [string, string][] = [['#2563EB', l('Yurgan yo‘li', 'Путь', 'Path')], ['#16A34A', l('Yetkazildi', 'Доставлен', 'Delivered')], ['#DC2626', l('Yetkazilmadi', 'Не доставлен', 'Failed')], ['#6B7280', l('Qabul qildi', 'Принял', 'Accepted')], ['#7C3AED', l('Mijoz manzili', 'Адрес клиента', 'Customer address')], ['#111827', l('S — boshlanish, E — oxiri', 'S — начало, E — конец', 'S — start, E — end')]];
  return <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>{items.map(([c, t]) => <Stack key={t} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c }} /><Typography variant="caption">{t}</Typography></Stack>)}</Stack>;
}
