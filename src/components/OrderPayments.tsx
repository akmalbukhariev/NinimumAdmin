import { useState } from 'react';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import type { Row } from '../api/managementApi';
import { money, StatusChip, useL } from './AdminCommon';

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  // The current Admin site uses HTTP, where the Clipboard API is unavailable.
  const previousFocus = document.activeElement;
  const field = document.createElement('textarea');
  field.value = value;
  field.style.position = 'fixed';
  field.style.left = '-9999px';
  document.body.appendChild(field);
  try {
    field.select();
    if (!document.execCommand('copy')) throw new Error('Copy unavailable');
  } finally {
    field.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }
}

export function OrderPayments({ orderId, payments }: { orderId: number; payments?: Row[] }) {
  const l = useL();
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const copy = async (value: string) => {
    try {
      await copyText(value);
      setFeedback({ error: false, text: l('ID nusxalandi.', 'ID скопирован.', 'ID copied.') });
    } catch {
      setFeedback({ error: true, text: l('Nusxalab bo‘lmadi. ID ni belgilab, qo‘lda nusxalang.', 'Не удалось скопировать. Выделите ID и скопируйте вручную.', 'Could not copy. Select the ID and copy it manually.') });
    }
  };
  const timestamp = (value: unknown) => Number(value) > 0 ? new Date(Number(value)).toLocaleString() : '—';
  return <Stack spacing={2} sx={{ my: 3 }}>
    <Typography variant="h6">{l('To‘lov va pulni qaytarish', 'Оплата и возврат средств', 'Payment and refund')}</Typography>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography>{l('Buyurtma ID si', 'ID заказа', 'Order ID')}: <Box component="span" sx={{ userSelect: 'text', fontWeight: 700 }}>{orderId}</Box></Typography>
      <Button size="small" startIcon={<ContentCopyRounded />} onClick={() => void copy(String(orderId))}>{l('Nusxalash', 'Копировать', 'Copy')}</Button>
    </Stack>
    {feedback && <Alert severity={feedback.error ? 'error' : 'success'} onClose={() => setFeedback(null)}>{feedback.text}</Alert>}
    {payments === undefined ? <Alert severity="warning">{l('To‘lov ma’lumotlari kelmadi. Backendni yangilab, qayta yuklang.', 'Данные оплаты не получены. Обновите backend и загрузите снова.', 'Payment details were not returned. Update the backend and refresh.')}</Alert> : payments.length === 0 ?
      <Alert severity="info">{l('Bu buyurtma uchun to‘lov yozuvi topilmadi.', 'Для этого заказа запись об оплате не найдена.', 'No payment record was found for this order.')}</Alert> : payments.map(payment => {
        const payme = payment.provider === 'PAYME';
        const paymentId = String(payment.provider_transaction_id || '');
        const refunded = payment.status === 'CANCELLED' && Number(payment.payme_perform_time) > 0;
        return <Box key={payment.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>{payment.provider} · {money(payment.amount)}</Typography>
              <StatusChip value={refunded ? 'REFUNDED' : payment.status} />
            </Stack>
            <Typography variant="body2" color="text.secondary">{payme ? l('Payme to‘lov ID si', 'ID платежа Payme', 'Payme payment ID') : l('To‘lov ID si', 'ID платежа', 'Payment ID')}</Typography>
            <Typography sx={{ overflowWrap: 'anywhere', userSelect: 'text', fontFamily: 'monospace' }}>{paymentId || '—'}</Typography>
            {!!paymentId && <Button startIcon={<ContentCopyRounded />} sx={{ alignSelf: 'flex-start' }} onClick={() => void copy(paymentId)}>{l('To‘lov ID sini nusxalash', 'Копировать ID платежа', 'Copy payment ID')}</Button>}
            <Typography variant="body2">{l('To‘langan vaqt', 'Время оплаты', 'Paid at')}: {timestamp(payment.payme_perform_time)}</Typography>
            {Number(payment.payme_cancel_time) > 0 && <Typography variant="body2">{l('Bekor qilingan vaqt', 'Время отмены', 'Cancelled at')}: {timestamp(payment.payme_cancel_time)}</Typography>}
          </Stack>
        </Box>;
      })}
    {payments?.some(payment => payment.provider === 'PAYME' && payment.provider_transaction_id) && <>
      <Divider />
      <Alert severity="info">{l('Pulni qaytarish Payme Business’da bajariladi. To‘lov ID sini nusxalang, Payme Business’da shu to‘lovni toping va bekor qiling. So‘ng bu oynadagi «Yangilash» tugmasini bosing. Faqat buyurtma holatini o‘zgartirish pulni qaytarmaydi.', 'Возврат выполняется в Payme Business. Скопируйте ID платежа, найдите платёж в Payme Business и отмените его. Затем нажмите «Обновить» в этом окне. Изменение статуса заказа само по себе не возвращает деньги.', 'Refunds are completed in Payme Business. Copy the payment ID, find that payment in Payme Business and cancel it. Then press Refresh in this dialog. Changing the order status alone does not return money.')}</Alert>
      <Button component="a" href="https://merchant.payme.uz/business" target="_blank" rel="noopener noreferrer" variant="contained" endIcon={<OpenInNewRounded />} sx={{ alignSelf: 'flex-start' }}>{l('Bekor qilish / pulni qaytarish — Payme Business', 'Отмена / возврат — Payme Business', 'Cancel / refund — Payme Business')}</Button>
    </>}
  </Stack>;
}
