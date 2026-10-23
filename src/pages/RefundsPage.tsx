import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { can } from '../auth/permissions';
import { LoadState, PageTitle, TablePanel, dateTime, money, useEnumLabel, useL } from '../components/AdminCommon';
import { copyText } from '../components/OrderPayments';
import { apiRequest } from '../api/client';
import { accounts as listAccounts } from '../api/financeApi';
import type { Row } from '../api/managementApi';

// K5 (TZ v11) "Qaytarish kerak": every customer still owed money. A whole payment goes back by cancelling it in Payme Business
// (Payme then confirms and the row leaves the list); a partial return is paid another way and recorded here.
const base = '/ninimum/api/v1/admin/management/refunds';
const tashkentToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
const day = (v: unknown) => { const [y, m, d] = String(v || '').slice(0, 10).split('-'); return d ? `${d}.${m}.${y}` : '—'; };

export default function RefundsPage() {
  const { accessToken, admin } = useAuth(), token = accessToken!, l = useL(), enumLabel = useEnumLabel();
  const [data, setData] = useState<{ pending: Row[]; done: Row[] } | null>(null), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [places, setPlaces] = useState<Row[]>([]), [form, setForm] = useState<Row | null>(null), [busy, setBusy] = useState(false);
  const editable = can(admin, 'money.edit');
  const load = useCallback(() => apiRequest<{ pending: Row[]; done: Row[] }>(base, { token }).then(r => { setData(r.resultData); setError(null); })
    .catch(() => setError(l('Ro‘yxatni yuklab bo‘lmadi.', 'Не удалось загрузить список.', 'Could not load the list.'))), [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); if (editable) listAccounts(token).then(setPlaces).catch(() => setPlaces([])); }, [load, editable, token]);
  const kind = (k: unknown) => k === 'PARTIAL' ? l('Qisman (tovar qaytdi)', 'Частично (товар вернули)', 'Partial (goods returned)') : l('To‘liq to‘lov', 'Весь платёж', 'Whole payment');
  const waited = (since: unknown) => { const t = Date.parse(String(since || '')); return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null; };
  const copy = async (v: string) => { try { await copyText(v); setNotice(l('Payme ID nusxalandi.', 'Payme ID скопирован.', 'Payme ID copied.')); } catch { setNotice(l('Nusxalab bo‘lmadi, ID ni qo‘lda belgilang.', 'Не удалось скопировать, выделите ID вручную.', 'Could not copy; select the ID manually.')); } };
  const save = async () => {
    if (!form) return; setBusy(true); setError(null);
    try { setData((await apiRequest<{ pending: Row[]; done: Row[] }>(`${base}/${form.order_id}/record`, { token, method: 'POST', body: JSON.stringify({ account_id: form.account_id, refund_date: form.refund_date, note: form.note }) })).resultData); setForm(null); setNotice(l('Qaytarish yozildi.', 'Возврат записан.', 'Refund recorded.')); }
    catch (e) {
      const c = e instanceof Error ? e.message : '';
      setError(c === 'PERIOD_CLOSED' ? l('Bu sana yopilgan davrga tushadi (Sozlamalar → Qoidalar → Davr yopish).', 'Эта дата в закрытом периоде (Настройки → Правила → Закрытие периода).', 'This date is in a closed period.')
        : c === 'FINANCE_FUTURE_DATE' ? l('Sana kelajakda bo‘lishi mumkin emas.', 'Дата не может быть в будущем.', 'The date can’t be in the future.')
        : c === 'REFUND_NOT_PENDING' ? l('Bu buyurtma bo‘yicha qaytarish kutilmayapti (allaqachon yozilgan bo‘lishi mumkin).', 'По этому заказу возврат не ожидается (возможно, уже записан).', 'No refund is pending for this order (it may already be recorded).')
        : c === 'ADMIN_PERMISSION_DENIED' ? l('Bu amal uchun ruxsatingiz yo‘q.', 'Нет прав на это действие.', 'You are not allowed to do this.')
        : l('Joyni tanlang va izoh yozing.', 'Выберите место и напишите комментарий.', 'Choose the money place and write a note.'));
    } finally { setBusy(false); }
  };

  return <>
    <PageTitle title={l('Qaytarish kerak', 'Нужно вернуть', 'Refunds owed')} />
    <Alert severity="info" sx={{ mb: 2 }}>{l(
      'To‘liq to‘lov: Payme ID ni nusxalang, Payme Business’da shu to‘lovni toping va bekor qiling. Payme tasdiqlagach, qator o‘zi ro‘yxatdan chiqadi. Qisman qaytarish: Payme bunday qila olmaydi — pulni boshqa yo‘l bilan qaytaring (naqd, karta) va «Qaytarildi» tugmasi bilan yozing.',
      'Весь платёж: скопируйте Payme ID, найдите платёж в Payme Business и отмените его. После подтверждения Payme строка исчезнет сама. Частичный возврат: Payme так не умеет — верните деньги другим способом (наличные, карта) и отметьте кнопкой «Возвращено».',
      'Whole payment: copy the Payme ID, find the payment in Payme Business and cancel it. When Payme confirms, the row leaves the list by itself. Partial return: Payme can’t do this — pay it another way (cash, card) and record it with “Refunded”.')}</Alert>
    {error && data && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
    <LoadState loading={!data && !error} error={data ? null : error} onRetry={() => void load()}>
      <Typography variant="h6" sx={{ mb: 1 }}>{l('Qaytarilishi kerak', 'Нужно вернуть', 'Still owed')} ({data?.pending.length ?? 0})</Typography>
      <TablePanel sx={{ mb: 3, overflowX: 'auto' }}><Table size="small">
        <TableHead><TableRow><TableCell>{l('Buyurtma', 'Заказ', 'Order')}</TableCell><TableCell>{l('Mijoz', 'Клиент', 'Customer')}</TableCell><TableCell>{l('Turi', 'Тип', 'Type')}</TableCell><TableCell align="right">{l('Summa', 'Сумма', 'Amount')}</TableCell>
          <TableCell>{l('Sabab', 'Причина', 'Reason')}</TableCell><TableCell>{l('Qachondan', 'С какого времени', 'Since')}</TableCell><TableCell>Payme ID</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {data?.pending.length === 0 && <TableRow><TableCell colSpan={8}>{l('Hammaga pul qaytarilgan.', 'Все возвраты выполнены.', 'Everyone has been refunded.')}</TableCell></TableRow>}
          {data?.pending.map(r => { const days = waited(r.since); return <TableRow key={`${r.kind}-${r.order_id}`}>
            <TableCell><RouterLink to={`/orders?order=${r.order_id}`}>{String(r.order_number)}</RouterLink><Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{enumLabel(r.status)}</Typography></TableCell>
            <TableCell>{String(r.customer_name || '—')}<Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{String(r.customer_phone || '')}</Typography></TableCell>
            <TableCell>{kind(r.kind)}</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{money(r.amount)}</TableCell><TableCell>{String(r.reason || '—')}</TableCell>
            <TableCell>{dateTime(r.since)}{days !== null && <Chip size="small" color={days >= 1 ? 'error' : 'warning'} label={days >= 1 ? l(`${days} kun`, `${days} дн.`, `${days} d`) : l('bugun', 'сегодня', 'today')} sx={{ ml: 1 }} />}</TableCell>
            <TableCell>{r.payme_id ? <Button size="small" startIcon={<ContentCopyRounded />} onClick={() => void copy(String(r.payme_id))}>{l('Nusxalash', 'Копировать', 'Copy')}</Button> : '—'}</TableCell>
            <TableCell>{r.kind === 'FULL'
              ? <Button size="small" variant="outlined" component="a" href="https://merchant.payme.uz/business" target="_blank" rel="noopener noreferrer" endIcon={<OpenInNewRounded />}>Payme Business</Button>
              : editable && <Button size="small" variant="contained" onClick={() => setForm({ order_id: r.order_id, order_number: r.order_number, amount: r.amount, account_id: places[0]?.id ?? '', refund_date: tashkentToday(), note: '' })}>{l('Qaytarildi', 'Возвращено', 'Refunded')}</Button>}</TableCell>
          </TableRow>; })}
        </TableBody></Table></TablePanel>
      <Typography variant="h6" sx={{ mb: 1 }}>{l('Qaytarilganlar (oxirgi 60 kun)', 'Возвращено (последние 60 дней)', 'Refunded (last 60 days)')}</Typography>
      <TablePanel sx={{ overflowX: 'auto' }}><Table size="small">
        <TableHead><TableRow><TableCell>{l('Buyurtma', 'Заказ', 'Order')}</TableCell><TableCell>{l('Mijoz', 'Клиент', 'Customer')}</TableCell><TableCell>{l('Turi', 'Тип', 'Type')}</TableCell><TableCell align="right">{l('Summa', 'Сумма', 'Amount')}</TableCell>
          <TableCell>{l('Qayerdan', 'Откуда', 'Paid from')}</TableCell><TableCell>{l('Sana', 'Дата', 'Date')}</TableCell><TableCell>{l('Izoh', 'Комментарий', 'Note')}</TableCell><TableCell>{l('Kim', 'Кто', 'By')}</TableCell></TableRow></TableHead>
        <TableBody>
          {data?.done.length === 0 && <TableRow><TableCell colSpan={8}>{l('Hali yo‘q.', 'Пока нет.', 'None yet.')}</TableCell></TableRow>}
          {data?.done.map((r, i) => <TableRow key={i}>
            <TableCell><RouterLink to={`/orders?order=${r.order_id}`}>{String(r.order_number)}</RouterLink></TableCell><TableCell>{String(r.customer_name || '—')}</TableCell><TableCell>{kind(r.kind)}</TableCell>
            <TableCell align="right">{money(r.amount)}</TableCell><TableCell>{String(r.place || '—')}</TableCell><TableCell>{typeof r.refunded_at === 'number' ? dateTime(r.refunded_at) : day(r.refunded_at)}</TableCell>
            <TableCell>{String(r.note || '—')}</TableCell><TableCell>{String(r.created_by || (r.kind === 'FULL' ? 'Payme' : '—'))}</TableCell>
          </TableRow>)}
        </TableBody></Table></TablePanel>
    </LoadState>
    {form && <Dialog open onClose={() => { if (!busy) setForm(null); }} fullWidth maxWidth="sm"><DialogTitle>{l('Qaytarishni yozish', 'Записать возврат', 'Record the refund')}: {String(form.order_number)}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Typography>{l('Summa', 'Сумма', 'Amount')}: <b>{money(form.amount)}</b></Typography>
        <TextField select required label={l('Qayerdan to‘landi', 'Откуда оплачено', 'Paid from')} value={form.account_id} disabled={busy} onChange={e => setForm({ ...form, account_id: e.target.value })}>
          {places.map(p => <MenuItem key={String(p.id)} value={p.id as number}>{String(p.name)}</MenuItem>)}
        </TextField>
        <TextField type="date" label={l('Sana', 'Дата', 'Date')} value={form.refund_date} disabled={busy} onChange={e => setForm({ ...form, refund_date: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: tashkentToday() } }} />
        <TextField required multiline minRows={2} label={l('Izoh (qanday qaytarildi)', 'Комментарий (как вернули)', 'Note (how it was paid)')} placeholder={l('Masalan: naqd berildi / kartaga o‘tkazildi', 'Например: выдано наличными / переведено на карту', 'E.g. paid in cash / sent to card')} value={form.note} disabled={busy} onChange={e => setForm({ ...form, note: e.target.value })} />
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setForm(null)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
        <Button variant="contained" disabled={busy || !form.account_id || !String(form.note).trim()} onClick={() => void save()}>{l('Saqlash', 'Сохранить', 'Save')}</Button></DialogActions>
    </Dialog>}
  </>;
}
