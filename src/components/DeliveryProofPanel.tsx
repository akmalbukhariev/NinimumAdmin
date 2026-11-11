import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import { TextField } from './AdminField';
import { apiRequest } from '../api/client';
import { errorText } from '../api/errorText';
import { useAuth } from '../auth/AuthProvider';
import { can } from '../auth/permissions';
import type { Row } from '../api/managementApi';
import { dateTime, useL } from './AdminCommon';
import { CourierMap } from './CourierMap';
import { RouteLegend, RouteSummary, routeLayers } from '../pages/CourierMapPage';

// Courier GPS V1a: where the courier pressed each button, the delivery photo, the customer's answer, and "Tekshirildi".
const base = (id: number) => `/ninimum/api/v1/admin/management/orders/${id}/delivery-proof`;

export function DeliveryProofPanel({ orderId }: { orderId: number }) {
  const l = useL(), { accessToken, admin } = useAuth();
  const [data, setData] = useState<Row | null>(null), [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Row | null>(null), [routeOpen, setRouteOpen] = useState(false);
  const [checking, setChecking] = useState(false), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [photoOpen, setPhotoOpen] = useState(false);
  const load = useCallback(async () => {
    try { setData((await apiRequest<Row>(base(orderId), { token: accessToken! })).resultData); setError(null); }
    catch (e) { setError(errorText(e, l)); }
  }, [orderId, accessToken]);
  useEffect(() => { void load(); }, [load]);
  // Loading problems (for example an older backend) hide the panel; errors of the "Tekshirildi" save show inside it.
  if (!data?.available) return null;
  const actions = (data.actions as Row[]) || [];
  const recorded = actions.filter(a => a.latitude != null || a.location_error);
  const confirmation = data.confirmation as Row | null;
  if (!recorded.length && !data.photo && !confirmation) return null;
  const far = Number(data.far_meters || 300);
  const label: Record<string, string> = {
    ACCEPTED: l('Qabul qildi', 'Принял', 'Accepted'), ON_THE_WAY: l('Yo‘lga chiqdi', 'В пути', 'On the way'), DELIVERED: l('Yetkazildi', 'Доставлен', 'Delivered'),
    FAILED: l('Yetkazilmadi', 'Не доставлен', 'Failed'), PARTIAL_RETURN: l('Qisman qaytarish', 'Частичный возврат', 'Partial return'),
  };
  const errorLabel = (code: string) => ({
    PERMISSION_DENIED: l('Ruxsat berilmagan', 'Нет разрешения', 'No permission'), GPS_OFF: l('GPS o‘chiq', 'GPS выключен', 'GPS off'),
    TIMEOUT: l('Signal topilmadi', 'Нет сигнала', 'No signal'), NO_LOCATION: l('Joylashuv yuborilmagan', 'Место не передано', 'No location sent'),
  } as Record<string, string>)[code] || code;
  const place = (a: Row) => {
    if (a.latitude == null) return <Typography variant="body2" color="error.main">{errorLabel(String(a.location_error || 'NO_LOCATION'))}</Typography>;
    const accuracy = a.accuracy_m == null ? 0 : Math.min(100, Number(a.accuracy_m));
    const isFar = a.distance_m != null && Number(a.distance_m) > far + accuracy;
    return <Stack spacing={0.25}>
      <Link href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noopener" variant="body2">{l('Xaritada', 'На карте', 'On map')}</Link>
      {a.distance_m != null
        ? <Typography variant="body2" sx={{ color: isFar ? 'error.main' : 'success.main', fontWeight: isFar ? 700 : 400 }}>{l(`Mijozdan ${a.distance_m} m`, `${a.distance_m} м от клиента`, `${a.distance_m} m from the customer`)}</Typography>
        : <Typography variant="body2" color="text.secondary">{l('Mijoz nuqtasi yo‘q', 'Нет точки клиента', 'No customer point')}</Typography>}
      {a.accuracy_m != null && <Typography variant="caption" color="text.secondary">± {Math.round(Number(a.accuracy_m))} m</Typography>}
      {a.is_mock ? <Chip size="small" color="error" label={l('Soxta GPS', 'Фальшивый GPS', 'Fake GPS')} /> : null}
    </Stack>;
  };
  const check = async () => {
    setBusy(true);
    try { await apiRequest(`${base(orderId)}/check`, { token: accessToken!, method: 'POST', body: JSON.stringify({ note: note.trim() }) }); setChecking(false); setNote(''); await load(); }
    catch (e) { setError(errorText(e, l)); } finally { setBusy(false); }
  };
  return <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
    {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
      <FactCheckRounded color="primary" /><Typography sx={{ fontWeight: 800 }}>{l('Yetkazish isboti', 'Подтверждение доставки', 'Delivery proof')}</Typography>
    </Stack>
    {confirmation?.received_at
      ? <Alert severity="success" sx={{ mb: 1.5 }}>{l('Mijoz qabul qilganini tasdiqladi', 'Клиент подтвердил получение', 'The customer confirmed receipt')}: {dateTime(confirmation.received_at)}</Alert>
      : confirmation?.problem
        ? <Alert severity="error" sx={{ mb: 1.5 }}>{l('Mijoz muammo yozdi', 'Клиент сообщил о проблеме', 'The customer reported a problem')} ({dateTime(confirmation.problem_at)}): {confirmation.problem}</Alert>
        : actions.some(a => a.status === 'DELIVERED') && <Alert severity="info" sx={{ mb: 1.5 }}>{l('Mijoz hali tasdiqlamagan', 'Клиент ещё не подтвердил', 'The customer has not confirmed yet')}</Alert>}
    {confirmation?.checked_at && <Alert severity="success" icon={false} sx={{ mb: 1.5 }}>{l('Tekshirildi', 'Проверено', 'Checked')}: {confirmation.checked_by} · {dateTime(confirmation.checked_at)} — {confirmation.check_note}</Alert>}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      {data.photo && <Box component="img" src={data.photo} alt={l('Yetkazish rasmi', 'Фото доставки', 'Delivery photo')} onClick={() => setPhotoOpen(true)}
        sx={{ width: { xs: '100%', md: 180 }, maxHeight: 220, objectFit: 'contain', borderRadius: 1, cursor: 'zoom-in', bgcolor: 'grey.100', flexShrink: 0 }} />}
      <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <Table size="small"><TableHead><TableRow>
          <TableCell>{l('Amal', 'Действие', 'Action')}</TableCell><TableCell>{l('Vaqt', 'Время', 'Time')}</TableCell><TableCell>{l('Joy', 'Место', 'Place')}</TableCell>
        </TableRow></TableHead><TableBody>{actions.map((a, i) => <TableRow key={i}>
          <TableCell>{label[String(a.status)] || a.status}<Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{a.courier}</Typography></TableCell>
          <TableCell>{dateTime(a.created_at)}</TableCell>
          <TableCell>{a.latitude == null && !a.location_error ? <Typography variant="body2" color="text.secondary">—</Typography> : place(a)}</TableCell>
        </TableRow>)}</TableBody></Table>
      </Box>
    </Stack>
    <Button size="small" sx={{ mt: 1.5, mr: 1 }} onClick={() => { setRouteOpen(true); void apiRequest<Row>(`/ninimum/api/v1/admin/management/orders/${orderId}/route`, { token: accessToken! }).then(r => setRoute(r.resultData)).catch(e => setError(errorText(e, l))); }}>{l('Yo‘lni xaritada ko‘rish', 'Маршрут на карте', 'Route on the map')}</Button>
    {can(admin, 'orders.edit') && !confirmation?.checked_at && <Button size="small" sx={{ mt: 1.5 }} onClick={() => setChecking(true)}>{l('Tekshirildi deb belgilash', 'Отметить как проверенное', 'Mark as checked')}</Button>}
    <Dialog open={checking} onClose={() => { if (!busy) setChecking(false); }} fullWidth maxWidth="xs">
      <DialogTitle>{l('Yetkazish tekshirildi', 'Доставка проверена', 'Delivery checked')}</DialogTitle>
      <DialogContent sx={{ pt: '20px!important' }}><Stack spacing={2}>
        <Typography variant="body2">{l('Bu buyurtma bo‘yicha yetkazish ogohlantirishlari yopiladi.', 'Предупреждения по доставке этого заказа будут закрыты.', 'Delivery alerts for this order will be closed.')}</Typography>
        <TextField required multiline label={l('Izoh (nima aniqlandi)', 'Комментарий (что выяснено)', 'Note (what was found)')} value={note} onChange={e => setNote(e.target.value)} />
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setChecking(false)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
        <Button variant="contained" disabled={busy || !note.trim()} onClick={() => void check()}>{l('Saqlash', 'Сохранить', 'Save')}</Button></DialogActions>
    </Dialog>
    <Dialog open={routeOpen} onClose={() => setRouteOpen(false)} fullWidth maxWidth="lg">
      <DialogTitle>{l('Kuryer yo‘li', 'Маршрут курьера', 'Courier route')} · №{orderId}</DialogTitle>
      <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
        {route ? <><RouteSummary summary={(route.summary as Row) || { points: 0 }} /><CourierMap {...routeLayers(route, l)} height={520} fitKey={`order-${orderId}-${((route.points as Row[]) || []).length}`} /><RouteLegend /></>
          : <Typography color="text.secondary">{l('Yuklanmoqda…', 'Загрузка…', 'Loading…')}</Typography>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setRouteOpen(false)}>{l('Yopish', 'Закрыть', 'Close')}</Button></DialogActions>
    </Dialog>
    <Dialog open={photoOpen} onClose={() => setPhotoOpen(false)} maxWidth="md"><Box component="img" src={data.photo} sx={{ maxWidth: '100%', maxHeight: '85vh', display: 'block' }} /></Dialog>
  </Box>;
}
