import type { Row } from '../api/managementApi';
export async function createSupplierWorkbook(detail: Row, l: (uz:string,ru:string,en:string)=>string) {
  const{Workbook}=await import('exceljs');const book=new Workbook();
  const invoices=book.addWorksheet(l('Kirimlar','Приходы','Receipts'));
  invoices.addRow([detail.name,l('Qoldiq','Баланс','Balance'),Number(detail.outstanding_amount)]);
  invoices.addRow([l('Kirim','Приход','Receipt'),l('Nakladnoy','Накладная','Invoice'),l('Sana','Дата','Date'),l('Muddat','Срок','Due date'),l('Holat','Статус','Status'),l('Summa','Сумма','Amount'),l('Qoldiq','Остаток','Outstanding')]);
  for(const r of detail.invoices||[])invoices.addRow([`KR-${r.receipt_id}`,r.invoice_number,r.invoice_date,r.due_date,r.status,Number(r.invoice_amount),r.status==='POSTED'?Number(r.outstanding_amount):0]);
  const payments=book.addWorksheet(l('To‘lov yozuvlari','Записи оплат','Payment records'));
  payments.addRow([l('Kirim','Приход','Receipt'),l('Sana','Дата','Date'),l('Asos','Основание','Reference'),l('Summa','Сумма','Amount'),l('Holat','Статус','Status'),l('Kim','Кто','Who'),l('Bekor qilish sababi','Причина отмены','Void reason')]);
  for(const r of detail.payments||[])payments.addRow([`KR-${r.receipt_id}`,r.paid_date,r.reference,Number(r.amount),r.status,r.created_by,r.void_reason]);
  for(const sheet of [invoices,payments]){for(let i=1;i<=sheet.columnCount;i++)sheet.getColumn(i).width=22;sheet.getRow(sheet===invoices?2:1).font={bold:true};}
  return book;
}
