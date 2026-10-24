import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../api/errorText';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthProvider';
import { can } from '../auth/permissions';
import { LoadState, PageTitle, Panel, TablePanel, dateTime, money, useL } from '../components/AdminCommon';
import { readReturnPhoto } from '../components/ReturnEvidence';
import * as api from '../api/financeApi';
import type { Row } from '../api/managementApi';

// TZ v10 §9 "Pul": money places, expenses / income / transfers, money movement and the monthly result. Owner and Director only.
const tashkentToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
const monthStart = () => `${tashkentToday().slice(0, 8)}01`;
const day = (v: unknown) => { const [y, m, d] = String(v || '').slice(0, 10).split('-'); return d ? `${d}.${m}.${y}` : '—'; };

export default function FinancePage() {
  const { accessToken, admin } = useAuth(), token = accessToken!, l = useL();
  const editable = can(admin, 'money.edit'), owner = admin?.role === 'SUPER_ADMIN';
  const [tab, setTab] = useState(0), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Row[] | null>(null), [types, setTypes] = useState<Row[]>([]);
  const message = (e: unknown) => {
    const code = e instanceof Error ? e.message : '';
    const known: Record<string, [string, string, string]> = {
      PERIOD_CLOSED: ['Bu sana yopilgan davrga tushadi (Sozlamalar → Qoidalar → Davr yopish).', 'Эта дата в закрытом периоде (Настройки → Правила → Закрытие периода).', 'This date is in a closed period (Settings → Rules → Period closing).'],
      FINANCE_PHOTO_REQUIRED: ['Xarajatga chek rasmini qo‘shing.', 'Добавьте фото чека.', 'Add a receipt photo.'],
      FINANCE_INVALID_AMOUNT: ['Summani tekshiring (0 dan katta, 2 xonadan ko‘p kasr yo‘q).', 'Проверьте сумму (больше 0, не более 2 знаков после запятой).', 'Check the amount (above 0, at most 2 decimals).'],
      FINANCE_FUTURE_DATE: ['Sana kelajakda bo‘lishi mumkin emas.', 'Дата не может быть в будущем.', 'The date can’t be in the future.'],
      FINANCE_DUPLICATE_TYPE: ['Bunday xarajat turi bor.', 'Такой тип расхода уже есть.', 'This expense type already exists.'],
      WAREHOUSE_INVALID_STATE: ['Hujjat allaqachon bekor qilingan.', 'Документ уже сторнирован.', 'The document is already reversed.'],
      WAREHOUSE_INVALID_INPUT: ['Majburiy maydonlarni tekshiring.', 'Проверьте обязательные поля.', 'Check the required fields.'],
      ADMIN_PERMISSION_DENIED: ['Bu amal uchun ruxsatingiz yo‘q.', 'Нет прав на это действие.', 'You are not allowed to do this.'],
    };
    const m = known[code]; return m ? l(...m) : errorText(e, l);
  };
  const run = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); setError(null); try { await action(); } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  const loadAccounts = useCallback(() => api.accounts(token).then(setAccounts).catch(e => setError(message(e))), [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadAccounts(); api.expenseTypes(token).then(setTypes).catch(() => setTypes([])); }, [token, loadAccounts]);
  const kindLabel = (k: unknown) => ({ EXPENSE: l('Xarajat', 'Расход', 'Expense'), INCOME: l('Kirim', 'Поступление', 'Income'), TRANSFER: l('O‘tkazma', 'Перевод', 'Transfer') } as Record<string, string>)[String(k)] || String(k);

  return <>
    <PageTitle title={l('Pul', 'Деньги', 'Money')} />
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
      <Tab label={l('Kassa va hisoblar', 'Касса и счета', 'Cash and accounts')} /><Tab label={l('Hujjatlar', 'Документы', 'Documents')} />
      <Tab label={l('Pul harakati', 'Движение денег', 'Money movement')} /><Tab label={l('Oylik natija', 'Итог месяца', 'Monthly result')} />
    </Tabs>
    {tab === 0 && <Balances token={token} accounts={accounts} editable={editable} busy={busy} run={run} reload={loadAccounts} />}
    {tab === 1 && <Documents token={token} accounts={accounts || []} types={types} setTypes={setTypes} editable={editable} owner={owner} busy={busy} run={run} kindLabel={kindLabel} reload={loadAccounts} />}
    {tab === 2 && <Movement token={token} run={run} />}
    {tab === 3 && <Monthly token={token} run={run} />}
  </>;
}

type Run = (action: () => Promise<void>) => Promise<void>;

function Balances({ token, accounts, editable, busy, run, reload }: { token: string; accounts: Row[] | null; editable: boolean; busy: boolean; run: Run; reload: () => void }) {
  const l = useL();
  const [opening, setOpening] = useState<Row | null>(null), [count, setCount] = useState<Row>({ account_id: '', counted_amount: '', note: '' }), [result, setResult] = useState<Row | null>(null), [counts, setCounts] = useState<Row[]>([]);
  const loadCounts = useCallback(() => api.counts(token).then(setCounts).catch(() => setCounts([])), [token]);
  useEffect(() => { void loadCounts(); }, [loadCounts]);
  useEffect(() => { if (!count.account_id && accounts?.length) setCount(c => ({ ...c, account_id: String(accounts.find(a => a.code === 'CASH')?.id ?? accounts[0].id) })); }, [accounts, count.account_id]);
  return <LoadState loading={accounts === null} error={null} onRetry={reload}>
    <TablePanel><Table><TableHead><TableRow><TableCell>{l('Joy', 'Место', 'Place')}</TableCell><TableCell>{l('Boshlang‘ich qoldiq', 'Начальный остаток', 'Opening balance')}</TableCell><TableCell>{l('Hozirgi qoldiq', 'Текущий остаток', 'Current balance')}</TableCell><TableCell /></TableRow></TableHead>
      <TableBody>{accounts?.map(a => <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell>{a.opening_date ? `${money(a.opening_balance)} · ${day(a.opening_date)}` : '—'}</TableCell><TableCell sx={{ fontWeight: 700 }}>{money(a.balance)}</TableCell>
        <TableCell>{editable && <Button size="small" onClick={() => setOpening({ id: a.id, name: a.name, opening_balance: a.opening_balance ?? 0, opening_date: a.opening_date || tashkentToday() })}>{l('Boshlang‘ich qoldiq', 'Начальный остаток', 'Opening balance')}</Button>}</TableCell></TableRow>)}</TableBody></Table></TablePanel>
    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>{l('Kassani sanash', 'Пересчёт кассы', 'Cash count')}</Typography>
    {editable && <Panel sx={{ p: 2, mb: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField select size="small" label={l('Joy', 'Место', 'Place')} value={count.account_id} onChange={e => setCount({ ...count, account_id: e.target.value })} sx={{ minWidth: 200 }}>{accounts?.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}</TextField>
      <TextField size="small" type="number" label={l('Sanalgan summa', 'Посчитанная сумма', 'Counted amount')} value={count.counted_amount} onChange={e => setCount({ ...count, counted_amount: e.target.value })} />
      <TextField size="small" label={l('Izoh', 'Примечание', 'Note')} value={count.note} onChange={e => setCount({ ...count, note: e.target.value })} />
      <Button variant="contained" disabled={busy || count.counted_amount === ''} onClick={() => void run(async () => { setResult(await api.addCount(token, count)); setCount({ ...count, counted_amount: '', note: '' }); await loadCounts(); })}>{l('Saqlash', 'Сохранить', 'Save')}</Button>
    </Stack>{result && <Alert severity={Number(result.difference) === 0 ? 'success' : 'warning'} sx={{ mt: 2 }}>{l('Tizimda', 'По системе', 'System')}: {money(result.system_amount)} · {l('Sanaldi', 'Посчитано', 'Counted')}: {money(result.counted_amount)} · {l('Farq', 'Разница', 'Difference')}: {money(result.difference)}</Alert>}</Panel>}
    <TablePanel><Table size="small"><TableHead><TableRow><TableCell>{l('Sana', 'Дата', 'Date')}</TableCell><TableCell>{l('Joy', 'Место', 'Place')}</TableCell><TableCell>{l('Tizimda', 'По системе', 'System')}</TableCell><TableCell>{l('Sanaldi', 'Посчитано', 'Counted')}</TableCell><TableCell>{l('Farq', 'Разница', 'Difference')}</TableCell><TableCell>{l('Kim', 'Кто', 'Who')}</TableCell></TableRow></TableHead>
      <TableBody>{counts.map(c => <TableRow key={c.id}><TableCell>{day(c.count_date)}</TableCell><TableCell>{c.account_name}</TableCell><TableCell>{money(c.system_amount)}</TableCell><TableCell>{money(c.counted_amount)}</TableCell><TableCell sx={{ color: Number(c.difference) === 0 ? undefined : 'warning.main', fontWeight: 700 }}>{money(c.difference)}</TableCell><TableCell>{c.created_by}{c.note && <Typography variant="caption" sx={{ display: 'block' }}>{c.note}</Typography>}</TableCell></TableRow>)}</TableBody></Table>
      {counts.length === 0 && <Typography sx={{ p: 2 }}>{l('Hali sanash yo‘q.', 'Пересчётов ещё нет.', 'No counts yet.')}</Typography>}</TablePanel>
    <Dialog open={!!opening} onClose={() => !busy && setOpening(null)} fullWidth maxWidth="xs"><DialogTitle>{opening?.name}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Alert severity="info">{l('Shu kun boshidagi qoldiq. Undan oldingi harakatlar hisobga olinmaydi.', 'Остаток на начало этого дня. Более ранние движения не учитываются.', 'The balance at the start of this day. Earlier movements are not counted.')}</Alert>
      <TextField type="number" label={l('Summa', 'Сумма', 'Amount')} value={opening?.opening_balance ?? ''} onChange={e => setOpening(o => o && { ...o, opening_balance: e.target.value })} />
      <TextField type="date" label={l('Sana', 'Дата', 'Date')} slotProps={{ inputLabel: { shrink: true } }} value={opening?.opening_date ?? ''} onChange={e => setOpening(o => o && { ...o, opening_date: e.target.value })} />
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setOpening(null)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button>
      <Button variant="contained" disabled={busy} onClick={() => void run(async () => { await api.setOpening(token, opening!.id, { opening_balance: opening!.opening_balance, opening_date: opening!.opening_date }); setOpening(null); reload(); })}>{l('Saqlash', 'Сохранить', 'Save')}</Button></DialogActions></Dialog>
  </LoadState>;
}

function Documents({ token, accounts, types, setTypes, editable, owner, busy, run, kindLabel, reload }: { token: string; accounts: Row[]; types: Row[]; setTypes: (t: Row[]) => void; editable: boolean; owner: boolean; busy: boolean; run: Run; kindLabel: (k: unknown) => string; reload: () => void }) {
  const l = useL();
  const [filter, setFilter] = useState({ kind: '', from: monthStart(), to: tashkentToday() }), [data, setData] = useState<Row | null>(null);
  const [form, setForm] = useState<Row | null>(null), [photo, setPhoto] = useState<string | null>(null), [reverse, setReverse] = useState<Row | null>(null), [typesOpen, setTypesOpen] = useState(false), [newType, setNewType] = useState('');
  const load = useCallback(() => api.documents(token, filter).then(setData).catch(() => setData({ items: [], total: 0 })), [token, filter]);
  useEffect(() => { void load(); }, [load]);
  const open = (kind: string) => setForm({ kind, doc_date: tashkentToday(), amount: '', account_id: String(accounts.find(a => a.code === 'CASH')?.id ?? ''), to_account_id: '', expense_type_id: '', counterparty: '', note: '', receipt_photo_base64: '' });
  const save = () => void run(async () => { await api.createDocument(token, { ...form, receipt_photo_base64: form!.receipt_photo_base64 || undefined }); setForm(null); await load(); reload(); });
  return <>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <TextField select size="small" label={l('Turi', 'Тип', 'Type')} value={filter.kind} onChange={e => setFilter({ ...filter, kind: e.target.value })} sx={{ minWidth: 160 }}><MenuItem value="">{l('Barchasi', 'Все', 'All')}</MenuItem>{['EXPENSE', 'INCOME', 'TRANSFER'].map(k => <MenuItem key={k} value={k}>{kindLabel(k)}</MenuItem>)}</TextField>
      <TextField size="small" type="date" label={l('Dan', 'С', 'From')} slotProps={{ inputLabel: { shrink: true } }} value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} />
      <TextField size="small" type="date" label={l('Gacha', 'По', 'To')} slotProps={{ inputLabel: { shrink: true } }} value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} />
      {editable && <><Button variant="contained" onClick={() => open('EXPENSE')}>{l('Xarajat', 'Расход', 'Expense')}</Button><Button variant="outlined" onClick={() => open('INCOME')}>{l('Kirim', 'Поступление', 'Income')}</Button><Button variant="outlined" onClick={() => open('TRANSFER')}>{l('O‘tkazma', 'Перевод', 'Transfer')}</Button></>}
      {owner && <Button onClick={() => setTypesOpen(true)}>{l('Xarajat turlari', 'Типы расходов', 'Expense types')}</Button>}
    </Stack>
    <LoadState loading={data === null} error={null} onRetry={() => void load()}><TablePanel><Table size="small"><TableHead><TableRow>
      <TableCell>{l('Sana', 'Дата', 'Date')}</TableCell><TableCell>{l('Turi', 'Тип', 'Type')}</TableCell><TableCell>{l('Summa', 'Сумма', 'Amount')}</TableCell><TableCell>{l('Joy', 'Место', 'Place')}</TableCell><TableCell>{l('Kimga / kimdan', 'Кому / от кого', 'To / from')}</TableCell><TableCell>{l('Holat', 'Статус', 'Status')}</TableCell><TableCell /></TableRow></TableHead>
      <TableBody>{(data?.items as Row[] | undefined)?.map(d => <TableRow key={d.id} sx={{ opacity: d.status === 'REVERSED' ? 0.55 : 1 }}>
        <TableCell>{day(d.doc_date)}</TableCell><TableCell>{kindLabel(d.kind)}{d.expense_type && <Typography variant="caption" sx={{ display: 'block' }}>{d.expense_type}</Typography>}</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>{money(d.amount)}</TableCell><TableCell>{d.account_name}{d.to_account_name && ` → ${d.to_account_name}`}</TableCell>
        <TableCell>{d.counterparty || '—'}{d.note && <Typography variant="caption" sx={{ display: 'block' }}>{d.note}</Typography>}</TableCell>
        <TableCell><Chip size="small" color={d.status === 'REVERSED' ? 'default' : 'success'} label={d.status === 'REVERSED' ? l('Bekor qilingan', 'Сторнирован', 'Reversed') : l('Kiritilgan', 'Проведён', 'Posted')} /><Typography variant="caption" sx={{ display: 'block' }}>{d.created_by} · {dateTime(d.created_at)}</Typography>{d.reversal_reason && <Typography variant="caption" sx={{ display: 'block' }}>{d.reversed_by}: {d.reversal_reason}</Typography>}</TableCell>
        <TableCell><Stack direction="row">{Boolean(d.has_photo) && <Button size="small" onClick={() => void run(async () => setPhoto(String((await api.documentPhoto(token, d.id)).photo_data)))}>{l('Chek', 'Чек', 'Receipt')}</Button>}
          {editable && d.status === 'POSTED' && <Button size="small" color="warning" onClick={() => setReverse({ id: d.id, reason: '' })}>{l('Bekor qilish', 'Сторно', 'Reverse')}</Button>}</Stack></TableCell></TableRow>)}</TableBody></Table>
      {Number(data?.total) === 0 && <Typography sx={{ p: 2 }}>{l('Hujjat yo‘q.', 'Документов нет.', 'No documents.')}</Typography>}</TablePanel></LoadState>
    <Dialog open={!!form} onClose={() => !busy && setForm(null)} fullWidth maxWidth="sm"><DialogTitle>{kindLabel(form?.kind)}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <TextField type="date" label={l('Sana', 'Дата', 'Date')} slotProps={{ inputLabel: { shrink: true } }} value={form?.doc_date ?? ''} onChange={e => setForm(f => f && { ...f, doc_date: e.target.value })} />
      <TextField required type="number" label={l('Summa', 'Сумма', 'Amount')} value={form?.amount ?? ''} onChange={e => setForm(f => f && { ...f, amount: e.target.value })} />
      <TextField select required label={form?.kind === 'INCOME' ? l('Qayerga', 'Куда', 'Into') : l('Qayerdan', 'Откуда', 'From')} value={form?.account_id ?? ''} onChange={e => setForm(f => f && { ...f, account_id: e.target.value })}>{accounts.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}</TextField>
      {form?.kind === 'TRANSFER' && <TextField select required label={l('Qayerga', 'Куда', 'Into')} value={form.to_account_id} onChange={e => setForm(f => f && { ...f, to_account_id: e.target.value })}>{accounts.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}</TextField>}
      {form?.kind === 'EXPENSE' && <TextField select required label={l('Xarajat turi', 'Тип расхода', 'Expense type')} value={form.expense_type_id} onChange={e => setForm(f => f && { ...f, expense_type_id: e.target.value })}>{types.filter(t => Number(t.is_active) === 1 || t.is_active === true).map(t => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}</TextField>}
      {form?.kind !== 'TRANSFER' && <TextField label={form?.kind === 'EXPENSE' ? l('Kimga', 'Кому', 'To whom') : l('Kimdan', 'От кого', 'From whom')} value={form?.counterparty ?? ''} onChange={e => setForm(f => f && { ...f, counterparty: e.target.value })} />}
      <TextField label={l('Izoh', 'Примечание', 'Note')} value={form?.note ?? ''} onChange={e => setForm(f => f && { ...f, note: e.target.value })} />
      {form?.kind === 'EXPENSE' && <><Button component="label" variant="outlined" disabled={busy} sx={{ alignSelf: 'flex-start' }}>{form.receipt_photo_base64 ? l('Chekni almashtirish', 'Заменить чек', 'Replace receipt') : l('Chek rasmi', 'Фото чека', 'Receipt photo')}<input hidden type="file" accept="image/jpeg,image/png" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readReturnPhoto(file).then(p => setForm(f => f && { ...f, receipt_photo_base64: p })).catch(() => undefined); }} /></Button>
        {form.receipt_photo_base64 && <Box component="img" src={`data:image/jpeg;base64,${form.receipt_photo_base64}`} sx={{ display: 'block', alignSelf: 'flex-start', maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 1 }} />}</>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setForm(null)}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button><Button variant="contained" disabled={busy || !form?.amount || !form?.account_id || (form?.kind === 'TRANSFER' && !form.to_account_id) || (form?.kind === 'EXPENSE' && !form.expense_type_id)} onClick={save}>{l('Saqlash', 'Сохранить', 'Save')}</Button></DialogActions></Dialog>
    <Dialog open={!!photo} onClose={() => setPhoto(null)} maxWidth="md"><DialogContent>{photo && <Box component="img" src={photo} sx={{ display: 'block', maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />}</DialogContent><DialogActions><Button onClick={() => setPhoto(null)}>{l('Yopish', 'Закрыть', 'Close')}</Button></DialogActions></Dialog>
    <Dialog open={!!reverse} onClose={() => !busy && setReverse(null)} fullWidth maxWidth="xs"><DialogTitle>{l('Hujjatni bekor qilish', 'Сторно документа', 'Reverse document')}</DialogTitle><DialogContent><TextField fullWidth required sx={{ mt: 1 }} label={l('Sabab', 'Причина', 'Reason')} value={reverse?.reason ?? ''} onChange={e => setReverse(r => r && { ...r, reason: e.target.value })} /></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setReverse(null)}>{l('Yopish', 'Закрыть', 'Close')}</Button><Button color="warning" variant="contained" disabled={busy || !reverse?.reason.trim()} onClick={() => void run(async () => { await api.reverseDocument(token, reverse!.id, reverse!.reason); setReverse(null); await load(); reload(); })}>{l('Bekor qilish', 'Сторно', 'Reverse')}</Button></DialogActions></Dialog>
    <Dialog open={typesOpen} onClose={() => setTypesOpen(false)} fullWidth maxWidth="xs"><DialogTitle>{l('Xarajat turlari', 'Типы расходов', 'Expense types')}</DialogTitle><DialogContent>
      {types.map(t => <Stack key={t.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}><Typography>{t.name}</Typography><Switch checked={Number(t.is_active) === 1 || t.is_active === true} disabled={busy} onChange={e => void run(async () => setTypes(await api.saveExpenseType(token, t.id, { name: t.name, is_active: e.target.checked })))} /></Stack>)}
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}><TextField size="small" fullWidth label={l('Yangi tur', 'Новый тип', 'New type')} value={newType} onChange={e => setNewType(e.target.value)} /><Button disabled={busy || !newType.trim()} onClick={() => void run(async () => { setTypes(await api.addExpenseType(token, newType.trim())); setNewType(''); })}>{l('Qo‘shish', 'Добавить', 'Add')}</Button></Stack>
    </DialogContent><DialogActions><Button onClick={() => setTypesOpen(false)}>{l('Yopish', 'Закрыть', 'Close')}</Button></DialogActions></Dialog>
  </>;
}

function Movement({ token, run }: { token: string; run: Run }) {
  const l = useL();
  const [range, setRange] = useState({ from: monthStart(), to: tashkentToday() }), [data, setData] = useState<Row | null>(null);
  useEffect(() => { void run(async () => setData(await api.movement(token, range.from, range.to))); }, [token, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols: [string, string][] = [['payme', l('Payme tushumi', 'Поступления Payme', 'Payme income')], ['payme_refund', l('Payme qaytarish', 'Возвраты Payme', 'Payme refunds')], ['income', l('Boshqa kirim', 'Прочие поступления', 'Other income')], ['supplier', l('Yetkazib beruvchilarga', 'Поставщикам', 'To suppliers')], ['customer_refund', l('Mijozlarga qaytarish', 'Возвраты клиентам', 'Customer refunds')], ['expense', l('Xarajatlar', 'Расходы', 'Expenses')], ['transfer_in', l('O‘tkazma kirdi', 'Перевод вход', 'Transfer in')], ['transfer_out', l('O‘tkazma chiqdi', 'Перевод выход', 'Transfer out')]];
  return <>
    <Stack direction="row" spacing={2} sx={{ mb: 2 }}><TextField size="small" type="date" label={l('Dan', 'С', 'From')} slotProps={{ inputLabel: { shrink: true } }} value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /><TextField size="small" type="date" label={l('Gacha', 'По', 'To')} slotProps={{ inputLabel: { shrink: true } }} value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></Stack>
    <Alert severity="info" sx={{ mb: 2 }}>{l('Boshi + kirimlar − yetkazib beruvchilarga − xarajatlar ± o‘tkazmalar = Oxiri', 'Начало + поступления − поставщикам − расходы ± переводы = Конец', 'Start + income − suppliers − expenses ± transfers = End')}</Alert>
    <TablePanel><Table size="small"><TableHead><TableRow><TableCell>{l('Joy', 'Место', 'Place')}</TableCell><TableCell>{l('Boshi', 'Начало', 'Start')}</TableCell>{cols.map(([, t]) => <TableCell key={t}>{t}</TableCell>)}<TableCell>{l('Oxiri', 'Конец', 'End')}</TableCell></TableRow></TableHead>
      <TableBody>{(data?.accounts as Row[] | undefined)?.map(a => <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell>{money(Number(a.start) + Number(a.opening))}</TableCell>{cols.map(([k]) => <TableCell key={k}>{Number(a[k]) === 0 ? '—' : money(a[k])}</TableCell>)}<TableCell sx={{ fontWeight: 700 }}>{money(a.closing)}</TableCell></TableRow>)}</TableBody></Table></TablePanel>
  </>;
}

function Monthly({ token, run }: { token: string; run: Run }) {
  const l = useL();
  const [month, setMonth] = useState(tashkentToday().slice(0, 7)), [data, setData] = useState<Row | null>(null);
  useEffect(() => { void run(async () => setData(await api.monthly(token, month))); }, [token, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = (title: string, value: unknown, strong = false) => <Panel sx={{ p: 2, minWidth: 180 }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>{title}</Typography><Typography variant="h6" sx={{ fontWeight: strong ? 800 : 600 }}>{value as string}</Typography></Panel>;
  return <>
    <TextField size="small" type="month" label={l('Oy', 'Месяц', 'Month')} slotProps={{ inputLabel: { shrink: true } }} value={month} onChange={e => setMonth(e.target.value)} sx={{ mb: 2 }} />
    {data && <><Alert severity="info" sx={{ mb: 2 }}>{l('Sotuv − Tannarx − Xarajatlar = Foyda. Sotuv: yetkazilgan buyurtmalar, qaytarilgan qism chiqarilgan.', 'Продажи − Себестоимость − Расходы = Прибыль. Продажи: доставленные заказы за вычетом возвратов.', 'Sales − Cost − Expenses = Profit. Sales: delivered orders less returned part.')}</Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>{card(l('Sotuv', 'Продажи', 'Sales'), money(data.sales))}{card(l('Tannarx', 'Себестоимость', 'Cost'), money(data.cost))}{card(l('Xarajatlar', 'Расходы', 'Expenses'), money(data.expenses))}{card(l('Foyda', 'Прибыль', 'Profit'), money(data.profit), true)}{card(l('Marja', 'Маржа', 'Margin'), data.margin_percent == null ? '—' : `${data.margin_percent}%`)}</Stack>
      {(Number(data.cost_estimated_lines) > 0 || Number(data.cost_unknown_lines) > 0) && <Alert severity="warning" sx={{ mb: 2 }}>{l(`Tannarx: ${data.cost_estimated_lines} qator mahsulotning hozirgi tannarxi bilan taxminiy, ${data.cost_unknown_lines} qatorda tannarx yo‘q (0 deb olindi).`, `Себестоимость: ${data.cost_estimated_lines} строк по текущей себестоимости товара (оценка), в ${data.cost_unknown_lines} строках её нет (взято 0).`, `Cost: ${data.cost_estimated_lines} lines estimated from the product's current cost, ${data.cost_unknown_lines} lines have no cost (taken as 0).`)}</Alert>}
      <TablePanel><Table size="small"><TableHead><TableRow><TableCell>{l('Xarajat turi', 'Тип расхода', 'Expense type')}</TableCell><TableCell>{l('Summa', 'Сумма', 'Amount')}</TableCell></TableRow></TableHead><TableBody>{(data.expenses_by_type as Row[]).map(e => <TableRow key={e.type}><TableCell>{e.type}</TableCell><TableCell>{money(e.amount)}</TableCell></TableRow>)}</TableBody></Table>
        {(data.expenses_by_type as Row[]).length === 0 && <Typography sx={{ p: 2 }}>{l('Bu oyda xarajat yo‘q.', 'Расходов за месяц нет.', 'No expenses this month.')}</Typography>}</TablePanel></>}
  </>;
}
