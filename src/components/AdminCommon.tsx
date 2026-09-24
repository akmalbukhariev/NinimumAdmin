import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TableContainer, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import { useLanguage } from '../i18n/LanguageProvider';

export function useL() {
  const { language } = useLanguage();
  return (uz: string, ru: string, en: string) => language === 'uz' ? uz : language === 'ru' ? ru : en;
}

const enumLabels: Record<string, [string, string, string]> = {
  ACTIVE: ['Faol', 'Активен', 'Active'],
  INACTIVE: ['Faol emas', 'Неактивен', 'Inactive'],
  PENDING: ['Kutilmoqda', 'Ожидает', 'Pending'],
  CONFIRMED: ['Tasdiqlandi', 'Подтверждён', 'Confirmed'],
  PREPARING: ['Tayyorlanmoqda', 'Готовится', 'Preparing'],
  ACCEPTED: ['Qabul qilindi', 'Принят', 'Accepted'],
  ON_THE_WAY: ['Yo‘lda', 'В пути', 'On the way'],
  DELIVERED: ['Yetkazildi', 'Доставлен', 'Delivered'],
  CANCELLED: ['Bekor qilindi', 'Отменён', 'Cancelled'],
  PAID: ['To‘langan', 'Оплачен', 'Paid'],
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
  ADMIN: ['Administrator', 'Администратор', 'Administrator'],
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
  return <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'stretch', sm: 'center' },
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
      paddingBottom: { xs: '24px', sm: '30px' },
    }}
  >
    <Typography
      variant="h4"
      fontWeight={850}
      sx={{
        lineHeight: 1.1,
        marginRight: { xs: 0, sm: '32px' },
        marginBottom: { xs: '16px', sm: 0 },
      }}
    >
      {title}
    </Typography>
    {actionLabel && onAction && <Button variant="contained" startIcon={<AddRounded />} onClick={onAction} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>{actionLabel}</Button>}
  </Box>;
}

export function Panel({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', ...sx }}>{children}</Paper>;
}

export function TablePanel({ children, sx }: { children: ReactNode; sx?: object }) { return <Panel sx={{ mt: 2.5, ...sx }}><TableContainer>{children}</TableContainer></Panel>; }

export function LoadState({ loading, error, onRetry, children }: { loading: boolean; error: string | null; onRetry: () => void; children: ReactNode }) {
  const l = useL();
  if (loading) return <Box py={10} display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" action={<Button onClick={onRetry}>{l('Qayta urinish','Повторить','Retry')}</Button>}>{error}</Alert>;
  return <>{children}</>;
}

export function StatusChip({ value }: { value?: unknown }) {
  const enumLabel = useEnumLabel();
  const v = String(value ?? '-').toUpperCase();
  const success = ['ACTIVE','PAID','DELIVERED','CONFIRMED','ANSWERED','ONLINE','Y'].includes(v);
  const warning = ['PENDING','PREPARING','ACCEPTED','ON_THE_WAY','WAITING_ASSIGNMENT','WAITING'].includes(v);
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
export const dateTime = (value: unknown) => value ? String(value).replace('T',' ').slice(0,19) : '-';
