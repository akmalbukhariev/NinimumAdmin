import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { apiRequest } from '../api/client';
import { errorText } from '../api/errorText';
import type { Row } from '../api/managementApi';
import { TextField } from './AdminField';
import { PasswordField, useL } from './AdminCommon';

// TZ v13 item 2: the owner edits an administrator; everyone changes their own password.
const editAdmin = (token: string, id: number, body: Row) =>
  apiRequest<Row>(`/ninimum/api/v1/admin/management/admins/${id}`, { token, method: 'PUT', body: JSON.stringify(body) }).then(r => r.resultData);
export const signOutAdmin = (token: string, id: number) =>
  apiRequest<Row>(`/ninimum/api/v1/admin/management/admins/${id}/sign-out`, { token, method: 'POST' });
const changeOwnPassword = (token: string, old_password: string, new_password: string) =>
  apiRequest<Row>('/ninimum/api/v1/admin/me/password', { token, method: 'PUT', body: JSON.stringify({ old_password, new_password }) });

export function AdminEditDialog({ token, admin, onClose, onSaved }: { token: string; admin: Row; onClose: () => void; onSaved: () => void }) {
  const l = useL();
  const [name, setName] = useState(String(admin.name || '')), [login, setLogin] = useState(String(admin.login_id || ''));
  const [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setError(null);
    try { await editAdmin(token, Number(admin.id), { name: name.trim(), login_id: login.trim(), password }); onSaved(); onClose(); }
    catch (e) { setError(errorText(e, l)); } finally { setBusy(false); }
  };
  const signsOut = password !== '' || login.trim() !== String(admin.login_id || '');
  return <Dialog open onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="xs">
    <DialogTitle>{l('Administratorni tahrirlash', 'Редактировать администратора', 'Edit administrator')}</DialogTitle>
    <DialogContent sx={{ pt: '20px!important' }}><Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField required label={l('Ism', 'Имя', 'Name')} value={name} disabled={busy} onChange={e => setName(e.target.value)} />
      <TextField required label="Login" value={login} disabled={busy} onChange={e => setLogin(e.target.value)} />
      <PasswordField autoComplete="new-password" label={l('Yangi parol (o‘zgartirmasangiz bo‘sh qoldiring)', 'Новый пароль (оставьте пустым, если не меняете)', 'New password (leave empty to keep)')} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} />
      {signsOut && <Alert severity="info">{l('Saqlangandan keyin bu xodim tizimdan chiqariladi va yangi ma’lumot bilan qayta kiradi.', 'После сохранения сотрудник будет выведен из системы и войдёт заново с новыми данными.', 'After saving, this person is signed out and signs in again with the new details.')}</Alert>}
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button><Button variant="contained" disabled={busy || !name.trim() || !login.trim()} onClick={() => void save()}>{l('Saqlash', 'Сохранить', 'Save')}</Button></DialogActions>
  </Dialog>;
}

export function OwnPasswordDialog({ token, onClose }: { token: string; onClose: () => void }) {
  const l = useL();
  const [oldPassword, setOld] = useState(''), [next, setNext] = useState(''), [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [done, setDone] = useState(false);
  const mismatch = repeat !== '' && next !== repeat;
  const save = async () => {
    setBusy(true); setError(null);
    try { await changeOwnPassword(token, oldPassword, next); setDone(true); }
    catch (e) { setError(errorText(e, l)); } finally { setBusy(false); }
  };
  return <Dialog open onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="xs">
    <DialogTitle>{l('Parolni o‘zgartirish', 'Сменить пароль', 'Change password')}</DialogTitle>
    <DialogContent sx={{ pt: '20px!important' }}>{done
      ? <Typography>{l('Parol o‘zgartirildi. Keyingi kirishda yangi parolni kiriting.', 'Пароль изменён. При следующем входе введите новый пароль.', 'Password changed. Use the new password next time you sign in.')}</Typography>
      : <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        <PasswordField required autoComplete="current-password" label={l('Eski parol', 'Старый пароль', 'Old password')} value={oldPassword} disabled={busy} onChange={e => setOld(e.target.value)} />
        <PasswordField required autoComplete="new-password" label={l('Yangi parol', 'Новый пароль', 'New password')} value={next} disabled={busy} onChange={e => setNext(e.target.value)} />
        <PasswordField required autoComplete="new-password" label={l('Yangi parolni takrorlang', 'Повторите новый пароль', 'Repeat the new password')} value={repeat} disabled={busy} onChange={e => setRepeat(e.target.value)}
          error={mismatch} helperText={mismatch ? l('Parollar bir xil emas', 'Пароли не совпадают', 'Passwords don’t match') : undefined} />
      </Stack>}</DialogContent>
    <DialogActions>{done
      ? <Button variant="contained" onClick={onClose}>OK</Button>
      : <><Button disabled={busy} onClick={onClose}>{l('Bekor qilish', 'Отмена', 'Cancel')}</Button><Button variant="contained" disabled={busy || !oldPassword || !next || next !== repeat} onClick={() => void save()}>{l('Saqlash', 'Сохранить', 'Save')}</Button></>}</DialogActions>
  </Dialog>;
}
