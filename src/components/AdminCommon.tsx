import type { ReactNode } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TableContainer, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import { useLanguage } from '../i18n/LanguageProvider';

export function useL() {
  const { language } = useLanguage();
  return (uz: string, ru: string, en: string) => language === 'uz' ? uz : language === 'ru' ? ru : en;
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
  const v = String(value ?? '-').toUpperCase();
  const success = ['ACTIVE','PAID','DELIVERED','CONFIRMED','Y'].includes(v);
  const warning = ['PENDING','PREPARING','ACCEPTED','ON_THE_WAY','WAITING_ASSIGNMENT'].includes(v);
  const error = ['INACTIVE','CANCELLED','FAILED','DELETED','N'].includes(v);
  return <Chip size="small" label={v.replaceAll('_',' ')} color={success ? 'success' : warning ? 'warning' : error ? 'error' : 'default'} variant={success || warning || error ? 'filled' : 'outlined'} />;
}

export const money = (value: unknown) => `${new Intl.NumberFormat('uz-UZ').format(Number(value || 0))} so'm`;
export const dateTime = (value: unknown) => value ? String(value).replace('T',' ').slice(0,19) : '-';
