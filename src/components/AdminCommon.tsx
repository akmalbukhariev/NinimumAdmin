import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Paper, Portal, Snackbar, Stack, TableContainer, Typography, type SxProps, type TextFieldProps, type Theme } from '@mui/material';
import { TextField } from './AdminField';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import { useLanguage } from '../i18n/LanguageProvider';
import { errorText } from '../api/errorText';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { can, pagePermissions } from '../auth/permissions';

export function useL() {
  const { language } = useLanguage();
  return (uz: string, ru: string, en: string) => language === 'uz' ? uz : language === 'ru' ? ru : en;
}

const enumLabels: Record<string, [string, string, string]> = {
  ACTIVE: ['Faol', 'Активен', 'Active'],
  INACTIVE: ['Nofaol', 'Неактивен', 'Inactive'],
  PENDING: ['Kutilmoqda', 'Ожидает', 'Pending'],
  CONFIRMED: ['Tasdiqlandi', 'Подтверждён', 'Confirmed'],
  PREPARING: ['Tayyorlanmoqda', 'Готовится', 'Preparing'],
  READY: ['Tayyor', 'Готов', 'Ready'],
  ACCEPTED: ['Qabul qilindi', 'Принят', 'Accepted'],
  ON_THE_WAY: ['Yo‘lda', 'В пути', 'On the way'],
  DELIVERED: ['Yetkazildi', 'Доставлен', 'Delivered'],
  CANCELLED: ['Bekor qilindi', 'Отменён', 'Cancelled'],
  PAID: ['To‘langan', 'Оплачен', 'Paid'],
  RETURNED: ['Omborga qaytarildi', 'Возвращён на склад', 'Returned to warehouse'],
  CLAIM: ['Ombor xodimi oldi', 'Взят складом', 'Taken by warehouse'],
  PROBLEM: ['Muammo', 'Проблема', 'Problem'],
  RESUME: ['Davom ettirildi', 'Продолжено', 'Resumed'],
  RESET: ['Navbatga qaytarildi', 'Возвращён в очередь', 'Reset to queue'],
  RETURN_CLAIM: ['Qaytgan tovar tekshiruvda', 'Возврат на проверке', 'Return check started'],
  RETURN_RECEIVED: ['Qaytgan tovar qabul qilindi', 'Возврат принят', 'Return received'],
  OWNER_CORRECTION: ['Egasi tuzatdi', 'Исправлено владельцем', 'Owner correction'],
  RETURNING: ['Qaytarilmoqda', 'Возвращается', 'Returning'],
  RETURN_REPAIR: ['Qaytarish holatini tiklash', 'Исправление возврата', 'Return status repair'],
  FAILED: ['Muvaffaqiyatsiz', 'Ошибка', 'Failed'],
  REFUNDED: ['Qaytarilgan', 'Возвращён', 'Refunded'],
  DELETED: ['O‘chirilgan', 'Удалён', 'Deleted'],
  EXPIRED: ['Muddati tugagan', 'Истёк', 'Expired'],
  WAITING_ASSIGNMENT: ['Kuryer kutilmoqda', 'Ожидает назначения', 'Waiting assignment'],
  WAITING: ['Javob kutilmoqda', 'Ожидает ответа', 'Waiting'],
  ANSWERED: ['Javob berilgan', 'Отвечен', 'Answered'],
  HIDDEN: ['Yashirilgan', 'Скрыт', 'Hidden'],
  ONLINE: ['Onlayn', 'Онлайн', 'Online'],
  OFFLINE: ['Oflayn', 'Офлайн', 'Offline'],
  AMOUNT: ['Summa', 'Сумма', 'Amount'],
  RATE: ['Foiz', 'Процент', 'Percentage'],
  ADMIN: ['Cheklangan administrator', 'Администратор с ограничениями', 'Restricted administrator'],
  SUPER_ADMIN: ['Bosh administrator', 'Главный администратор', 'Super administrator'],
  Y: ['Faol', 'Активен', 'Active'],
  N: ['Faol emas', 'Неактивен', 'Inactive'],
};

export function useEnumLabel() {
  const { language } = useLanguage();
  const index = language === 'uz' ? 0 : language === 'ru' ? 1 : 2;
  return (value: unknown) => {
    const key = String(value ?? '').toUpperCase();
    const label = enumLabels[key];
    if (label) return label[index];
    if (!key) return '-';
    return key.toLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
  };
}

export function PageTitle({ title, subtitle: _subtitle, actionLabel, onAction }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  // M14: the add/create button needs edit rights on this page's area; view-only staff don't see it.
  const { admin } = useAuth(), { pathname } = useLocation();
  const view = pagePermissions[pathname];
  const editable = !view || can(admin, view.replace(/\.view$/, '.edit'));
  return <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'stretch', sm: 'center' },
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
      paddingBottom: { xs: '20px', sm: '30px' },
    }}
  >
    <Typography
      variant="h4"
      sx={{fontWeight:850,
        lineHeight: 1.1,
        fontSize: { xs: 28, sm: 32, md: 34 },
        marginRight: { xs: 0, sm: '32px' },
        marginBottom: { xs: '16px', sm: 0 },
      }}
    >
      {title}
    </Typography>
    {actionLabel && onAction && editable && <Button variant="contained" startIcon={<AddRounded />} onClick={onAction} sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, minHeight: { xs: 46, sm: 40 } }}>{actionLabel}</Button>}
  </Box>;
}

export function Panel({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Paper variant="outlined" sx={{ borderRadius: { xs: 2.5, sm: 3 }, overflow: 'hidden', ...sx }}>{children}</Paper>;
}

/** The scrolling area of a table: scrolls both ways, the header row stays on top. */
export function TableScroll({ children }: { children: ReactNode }) {
  return <>
    {/* Only the table scrolls (both ways); the header row stays on top so every column keeps its name. */}
    <TableContainer
      className="admin-table-scroll"
      sx={{
        overflow: 'auto',
        maxHeight: { xs: '70vh', md: 'calc(100vh - 240px)' },
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        '& table': { minWidth: { xs: 720, md: '100%' }, borderCollapse: 'separate', borderSpacing: 0 },
        '& thead th': { position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.12)' },
        '& tbody tr:hover td': { bgcolor: 'action.hover' },
      }}
    >
      {children}
    </TableContainer>
  </>;
}

export function TablePanel({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Panel sx={{ mt: { xs: 2, sm: 2.5 }, ...sx }}>
    <TableScroll>{children}</TableScroll>
  </Panel>;
}

export function LoadState({ loading, error, onRetry, children }: { loading: boolean; error: string | null; onRetry: () => void; children: ReactNode }) {
  const l = useL();
  if (loading) return <Box sx={{py:10,display:"grid", placeItems: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" action={<Button onClick={onRetry}>{l('Qayta urinish','Повторить','Retry')}</Button>}>{error}</Alert>;
  return <>{children}</>;
}

export function StatusChip({ value }: { value?: unknown }) {
  const enumLabel = useEnumLabel();
  const v = String(value ?? '-').toUpperCase();
  const success = ['ACTIVE','PAID','DELIVERED','CONFIRMED','READY','ANSWERED','ONLINE','Y'].includes(v);
  const warning = ['PENDING','PREPARING','ACCEPTED','ON_THE_WAY','RETURNING','WAITING_ASSIGNMENT','WAITING'].includes(v);
  const error = ['INACTIVE','CANCELLED','FAILED','DELETED','HIDDEN','EXPIRED','OFFLINE','N'].includes(v);
  return <Chip size="small" label={enumLabel(v)} color={success ? 'success' : warning ? 'warning' : error ? 'error' : 'default'} variant={success || warning || error ? 'filled' : 'outlined'} />;
}

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export function useConfirm() {
  const l = useL();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current = resolve;
    setOptions(nextOptions);
  }), []);

  const confirmDialog = <Dialog open={Boolean(options)} onClose={() => close(false)} fullWidth maxWidth="xs">
    <DialogTitle>{options?.title ?? l('Tasdiqlash', 'Подтверждение', 'Confirmation')}</DialogTitle>
    <DialogContent sx={{ pt: '12px!important' }}>
      <Typography>{options?.message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => close(false)}>{options?.cancelLabel ?? l('Yo‘q', 'Нет', 'No')}</Button>
      <Button variant="contained" color={options?.danger ? 'error' : 'primary'} onClick={() => close(true)}>{options?.confirmLabel ?? l('Ha', 'Да', 'Yes')}</Button>
    </DialogActions>
  </Dialog>;

  return { confirm, confirmDialog };
}

export const money = (value: unknown) => `${new Intl.NumberFormat('uz-UZ').format(Number(value || 0))} so'm`;
export { dateTime } from '../utils/dateTime';

/** Password input with an eye button that shows or hides the typed password. */
export function PasswordField(props: TextFieldProps) {
  const [show, setShow] = useState(false);
  return <TextField {...props} type={show ? 'text' : 'password'} slotProps={{ ...props.slotProps, input: { endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShow(v => !v)} edge="end" tabIndex={-1} aria-label="show password">{show ? <VisibilityOffRounded /> : <VisibilityRounded />}</IconButton></InputAdornment> } }} />;
}

/** Page error. When it appears while a dialog is open it is shown on top of the dialog, not hidden behind it. */
export function ErrorNotice({ message, onClose, sx }: { message: ReactNode; onClose?: () => void; sx?: SxProps<Theme> }) {
  const overDialog = useMemo(() => !!message && typeof document !== 'undefined' && !!document.querySelector('.MuiDialog-root'), [message]);
  if (!message) return null;
  if (overDialog) return <Portal><Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ zIndex: t => t.zIndex.modal + 100 }}><Alert severity="error" variant="filled" onClose={onClose} sx={{ maxWidth: 560 }}>{message}</Alert></Snackbar></Portal>;
  return <Alert severity="error" sx={sx} onClose={onClose}>{message}</Alert>;
}

export const passwordOk = (v: string) => v.length > 0;

/** Owner/admin sets a new password for a staff app account (courier or warehouse worker). */
export function PasswordResetDialog({ name, onClose, onSave }: { name: string | null; onClose: () => void; onSave: (password: string) => Promise<unknown> }) {
  const l = useL();
  const [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [done, setDone] = useState(false);
  const close = () => { if (busy) return; setPassword(''); setError(null); setDone(false); onClose(); };
  const save = async () => { setBusy(true); setError(null); try { await onSave(password); setDone(true); } catch (e) { setError(errorText(e, l)); } finally { setBusy(false); } };
  return <Dialog open={name !== null} onClose={close} fullWidth maxWidth="xs"><DialogTitle>{l('Parolni yangilash', 'Сменить пароль', 'Reset password')}{name ? ` · ${name}` : ''}</DialogTitle><DialogContent sx={{ pt: '12px!important' }}><Stack spacing={2}>{error && <Alert severity="error">{error}</Alert>}{done ? <Alert severity="success">{l('Yangi parol saqlandi. Xodimga yangi parolni ayting.', 'Новый пароль сохранён. Сообщите его сотруднику.', 'New password saved. Tell the employee the new password.')}</Alert> : <PasswordField required autoFocus fullWidth disabled={busy} label={l('Yangi parol', 'Новый пароль', 'New password')} value={password} autoComplete="new-password" onChange={e => setPassword(e.target.value)} />}</Stack></DialogContent><DialogActions><Button disabled={busy} onClick={close}>{done ? l('Yopish', 'Закрыть', 'Close') : l('Bekor qilish', 'Отмена', 'Cancel')}</Button>{!done && <Button variant="contained" disabled={busy || !passwordOk(password)} onClick={() => void save()}>{l('Saqlash', 'Сохранить', 'Save')}</Button>}</DialogActions></Dialog>;
}
