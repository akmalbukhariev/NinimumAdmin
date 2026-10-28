import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { TextField } from './AdminField';
import LocalTaxiRounded from '@mui/icons-material/LocalTaxiRounded';
import { apiRequest } from '../api/client';
import { errorText } from '../api/errorText';
import { useAuth } from '../auth/AuthProvider';
import { can } from '../auth/permissions';
import type { Row } from '../api/managementApi';
import { dateTime, money, useL } from './AdminCommon';

// Taxi delivery: the customer pays the driver; the operator books the taxi here once the warehouse has packed the order.
const base = (id: unknown) => `/ninimum/api/v1/admin/management/orders/${id}/taxi`;
const empty = { company: '', driver_name: '', driver_phone: '', car_number: '', quoted_fare: '', note: '' };

export function TaxiPanel({ order, onChanged }: { order: Row; onChanged: () => void }) {
  const l = useL(), { accessToken, admin } = useAuth(), token = accessToken!;
  const [taxi, setTaxi] = useState<Row | null>(null), [form, setForm] = useState<Record<string, string> | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const editable = can(admin, 'orders.edit'), status = String(order.status);
  useEffect(() => { apiRequest<Row | null>(base(order.id), { token }).then(r => setTaxi(r.resultData)).catch(() => setTaxi(null)); }, [order.id, status, token]);
  if (order.delivery_method !== 'TAXI') return null;

  const run = async (path: string, body?: unknown) => {
    setBusy(true); setError(null);
    try { setTaxi((await apiRequest<Row | null>(`${base(order.id)}/${path}`, { token, method: 'POST', body: JSON.stringify(body ?? {}) })).resultData); setForm(null); setFailReason(null); onChanged(); }
    catch (e) { setError(errorText(e, l)); }
    finally { setBusy(false); }
  };
  const field = (key: string, label: string, required = false, type = 'text') =>
    <TextField key={key} size="small" type={type} required={required} label={label} value={form?.[key] ?? ''} disabled={busy} onChange={e => setForm(f => ({ ...(f ?? empty), [key]: e.target.value }))} />;
  const startForm = () => setForm(taxi ? { company: String(taxi.company ?? ''), driver_name: String(taxi.driver_name ?? ''), driver_phone: String(taxi.driver_phone ?? ''), car_number: String(taxi.car_number ?? ''), quoted_fare: taxi.quoted_fare == null ? '' : String(taxi.quoted_fare), note: String(taxi.note ?? '') } : { ...empty });
  const valid = !!form && !!form.company.trim() && !!form.driver_phone.trim() && !!form.car_number.trim();

  return <Box sx={{ border: '1px solid', borderColor: 'warning.light', bgcolor: 'rgba(255,179,0,0.08)', borderRadius: 2, p: 2, mb: 2 }}>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}><LocalTaxiRounded color="warning" /><Typography sx={{ fontWeight: 700 }}>{l('Taksi orqali tezkor yetkazish', 'Срочная доставка на такси', 'Fast delivery by taxi')}</Typography></Stack>
    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{l('Taksi haqini mijoz haydovchiga o‘zi to‘laydi. Kuryerlar bu buyurtmani ko‘rmaydi.', 'Клиент сам оплачивает такси водителю. Курьеры этот заказ не видят.', 'The customer pays the driver. Couriers don’t see this order.')}</Typography>
    {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}
    {taxi && <Stack sx={{ mb: 1 }}>
      <Typography>{String(taxi.company)} · {String(taxi.car_number)}</Typography>
      <Typography>{l('Haydovchi', 'Водитель', 'Driver')}: {String(taxi.driver_name || '—')} · {String(taxi.driver_phone)}</Typography>
      {taxi.quoted_fare != null && <Typography>{l('Taksi haqi (mijoz to‘laydi)', 'Стоимость такси (платит клиент)', 'Taxi fare (customer pays)')}: {money(taxi.quoted_fare)}</Typography>}
      {taxi.note && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{String(taxi.note)}</Typography>}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{l('Chaqirdi', 'Вызвал', 'Booked by')}: {String(taxi.booked_by)} · {dateTime(taxi.booked_at)}{taxi.delivered_at ? ` · ${l('Yetkazildi', 'Доставлено', 'Delivered')}: ${dateTime(taxi.delivered_at)}` : ''}</Typography>
      {taxi.customer_problem && status === 'ON_THE_WAY' && <Alert severity="error" sx={{ mt: 1 }}>{l('Mijoz muammo yozdi', 'Клиент сообщил о проблеме', 'The customer reported a problem')} ({dateTime(taxi.customer_problem_at)}): «{String(taxi.customer_problem)}». {l('Mijozga qo‘ng‘iroq qiling.', 'Позвоните клиенту.', 'Call the customer.')}</Alert>}
      {(taxi.confirmed_by_customer === true || taxi.confirmed_by_customer === 1) && <Alert severity="success" sx={{ mt: 1 }}>{l('Mijoz mahsulotni olganini tasdiqladi.', 'Клиент подтвердил получение.', 'The customer confirmed receipt.')}</Alert>}
      {taxi.failed_reason && <Alert severity="warning" sx={{ mt: 1 }}>{l('Yetkazilmadi', 'Не доставлено', 'Not delivered')}: {String(taxi.failed_reason)}</Alert>}
    </Stack>}
    {['PENDING', 'CONFIRMED', 'PREPARING'].includes(status) && <Alert severity="info">{l('Ombor buyurtmani tayyorlagach («Tayyor»), shu yerda taksi chaqiring.', 'Когда склад подготовит заказ («Готов»), вызовите такси здесь.', 'Once the warehouse marks it ready, book the taxi here.')}</Alert>}
    {editable && <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {status === 'READY' && <Button variant="contained" color="warning" startIcon={<LocalTaxiRounded />} disabled={busy} onClick={startForm}>{l('Taksi chaqirish', 'Вызвать такси', 'Book a taxi')}</Button>}
      {status === 'ON_THE_WAY' && <>
        <Button variant="contained" color="success" disabled={busy} onClick={() => void run('delivered')}>{l('Yetkazildi', 'Доставлено', 'Delivered')}</Button>
        <Button variant="outlined" color="error" disabled={busy} onClick={() => setFailReason('')}>{l('Yetkazilmadi', 'Не доставлено', 'Not delivered')}</Button>
        <Button disabled={busy} onClick={startForm}>{l('Taksi ma’lumotini tuzatish', 'Исправить данные такси', 'Edit taxi details')}</Button>
      </>}
    </Stack>}
    {form && <Dialog open onClose={() => { if (!busy) setForm(null); }} fullWidth maxWidth="sm"><DialogTitle>{l('Taksi ma’lumotlari', 'Данные такси', 'Taxi details')}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {field('company', l('Taksi kompaniyasi (masalan, Yandex Go)', 'Служба такси (например, Yandex Go)', 'Taxi company (e.g. Yandex Go)'), true)}
        {field('driver_name', l('Haydovchi ismi', 'Имя водителя', 'Driver name'))}
        {field('driver_phone', l('Haydovchi telefoni', 'Телефон водителя', 'Driver phone'), true)}
        {field('car_number', l('Mashina raqami', 'Номер машины', 'Car number'), true)}
        {field('quoted_fare', l('Taksi haqi, so‘m (mijozga ko‘rsatiladi)', 'Стоимость такси, сум (видит клиент)', 'Taxi fare, so‘m (shown to the customer)'), false, 'number')}
        {field('note', l('Izoh', 'Комментарий', 'Note'))}
        {status === 'READY' && <Alert severity="info">{l('Saqlaganda buyurtma «Yo‘lda» bo‘ladi va mahsulot ombordan chiqqan hisoblanadi.', 'После сохранения заказ станет «В пути», товар считается выданным со склада.', 'Saving moves the order to “On the way” and hands the goods out of the warehouse.')}</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setForm(null)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
        <Button variant="contained" disabled={busy || !valid} onClick={() => void run('book', { ...form, quoted_fare: form.quoted_fare === '' ? null : Number(form.quoted_fare) })}>{status === 'READY' ? l('Taksi yo‘lga chiqdi', 'Такси выехало', 'Taxi is on the way') : l('Saqlash', 'Сохранить', 'Save')}</Button></DialogActions>
    </Dialog>}
    {failReason !== null && <Dialog open onClose={() => { if (!busy) setFailReason(null); }} fullWidth maxWidth="sm"><DialogTitle>{l('Taksi yetkaza olmadi', 'Такси не доставило', 'Taxi could not deliver')}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Alert severity="warning">{l('Buyurtma «Qaytarilmoqda» holatiga o‘tadi: mahsulot omborga qaytadi va pul «Qaytarish kerak» ro‘yxatiga tushadi.', 'Заказ перейдёт в «Возврат»: товар вернётся на склад, деньги попадут в список «Нужно вернуть».', 'The order becomes “Returning”: goods come back and the money goes to the Refunds owed list.')}</Alert>
        <TextField required multiline minRows={2} label={l('Sabab', 'Причина', 'Reason')} value={failReason} disabled={busy} onChange={e => setFailReason(e.target.value)} />
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setFailReason(null)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
        <Button variant="contained" color="error" disabled={busy || !failReason.trim()} onClick={() => void run('failed', { reason: failReason })}>{l('Tasdiqlash', 'Подтвердить', 'Confirm')}</Button></DialogActions>
    </Dialog>}
  </Box>;
}
