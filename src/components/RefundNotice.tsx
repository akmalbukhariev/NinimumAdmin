import { Alert, Typography } from '@mui/material';
import type { Row } from '../api/managementApi';
import { dateTime, useL } from './AdminCommon';

export function RefundNotice({ order, compact = false }: { order: Row; compact?: boolean }) {
  const l = useL();
  if (order.payment_status !== 'PAID' || Number(order.refund_pending)!==1) return null;
  const since = Date.parse(order.refund_pending_since || '');
  const overdue = Number.isFinite(since) && Date.now() - since > 24 * 60 * 60 * 1000;
  const text = overdue
    ? l('Pulni qaytarish 24 soatdan oshdi', 'Возврат ожидается более 24 часов', 'Refund pending over 24 hours')
    : l('Pulni qaytarish kutilmoqda', 'Ожидается возврат', 'Refund pending');
  if (compact) return <Typography color={overdue ? 'error.main' : 'warning.main'} variant="caption" sx={{ fontWeight: overdue ? 700 : 400 }}>{text}</Typography>;
  return <Alert severity={overdue ? 'error' : 'warning'}>{text}{Number.isFinite(since) && <Typography variant="body2">{l('Kutilmoqda:', 'Ожидается с:', 'Pending since:')} {dateTime(order.refund_pending_since)}</Typography>}</Alert>;
}
