import { Alert, Stack, Typography } from '@mui/material';
import type { Row } from '../api/managementApi';
import { money, useL } from './AdminCommon';
export default function PartialReturnNotice({ value }: { value?: Row | null }) {
  const l=useL();
  if(!value)return null;
  return <Alert severity="info" sx={{my:2}}><Stack spacing={1}>
    <Typography sx={{fontWeight:700}}>{l('Qisman yetkazildi, qisman qaytarildi','Доставлено с частичным возвратом','Delivered with partial return')}</Typography>
    {value.reason&&<Typography>{value.reason}</Typography>}
    <Typography>{value.status==='RECEIVED'?l('Qaytgan tovarlar omborga qabul qilindi.','Возвращённые товары приняты складом.','Returned goods received by warehouse.'):l('Qaytgan tovarlar ombor qabulini kutmoqda.','Возвращённые товары ожидают приёмки складом.','Returned goods await warehouse receipt.')}</Typography>
    {value.items?.map((item:Row)=><Typography key={item.product_id}>{item.product_name} × {item.quantity} · {money(item.refund_amount)}</Typography>)}
    <Typography sx={{fontWeight:700}}>{l('Qaytarilishi kerak bo‘lgan summa','Сумма к возврату','Amount owed')}: {money(value.refund_amount)}</Typography>
    {value.refund_status==='FULL_PAYMENT_REFUND'&&<Typography>{l('Payme to‘liq to‘lov qaytarilganini tasdiqladi.','Payme подтвердил возврат полного платежа.','Payme confirmed the whole payment was refunded.')}</Typography>}
    <Typography>{l('Yetkazish haqi o‘zgarmaydi. Bu yozuv pulni qaytarmaydi.','Стоимость доставки не меняется. Эта запись не выполняет возврат денег.','Delivery fee is retained. This record does not execute a refund.')}</Typography>
  </Stack></Alert>;
}
