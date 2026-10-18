import type { Row } from '../api/managementApi';
import { dateTime } from './dateTime';

// Excel has no timezone; store Tashkent wall-clock values and label that explicitly.
function orderDate(value: unknown): Date | null {
  const match=/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(dateTime(value));
  return match ? new Date(Date.UTC(Number(match[3]),Number(match[2])-1,Number(match[1]),Number(match[4]),Number(match[5]))) : null;
}
export async function createOrderWorkbook(rows:Row[],l:(uz:string,ru:string,en:string)=>string,label:(status:string)=>string,filters:Row={}) {
  const {Workbook}=await import('exceljs');
  const book=new Workbook();
  const sheet=book.addWorksheet(l('Buyurtmalar','Заказы','Orders'));
  sheet.addRow([l('Buyurtma №','Заказ №','Order №'),l('Buyurtma kodi','Код заказа','Order code'),l('Mijoz','Клиент','Customer'),l('Telefon','Телефон','Phone'),l('Mahsulot soni','Количество','Item quantity'),l('Mahsulot summasi','Сумма товаров','Subtotal'),l('Yetkazib berish','Доставка','Delivery'),l('Chegirma','Скидка','Discount'),l('Jami','Итого','Total'),l('To‘lov holati','Статус оплаты','Payment status'),l('Buyurtma holati','Статус заказа','Order status'),l('Vaqt (Toshkent)','Время (Ташкент)','Time (Tashkent)')]);
  const numeric=(value:unknown)=>value==null||value===''?null:Number(value);
  for(const row of rows) sheet.addRow([Number(row.id),String(row.order_number??''),row.customer_name??'',String(row.phone_number??''),numeric(row.product_count),numeric(row.subtotal_price),numeric(row.delivery_price),numeric(row.discount_price),numeric(row.total_price),label(row.payment_status),label(row.status),orderDate(row.ordered_at)]);
  const lastData=sheet.rowCount;
  const total=sheet.addRow([l('Jami','Итого','Total')]);
  if(rows.length) for(const [column,key] of [[5,'product_count'],[6,'subtotal_price'],[7,'delivery_price'],[8,'discount_price'],[9,'total_price']] as const) {
    const letter=sheet.getColumn(column).letter;
    const result=rows.reduce((sum,row)=>sum+Math.round(Number(row[key]??0)*100),0)/100;
    total.getCell(column).value={formula:`SUM(${letter}2:${letter}${lastData})`,result};
  }
  total.font={bold:true};
  sheet.addRow([]);
  sheet.addRow([l('Qidirish','Поиск','Search'),String(filters.search??'')]);
  sheet.addRow([l('Buyurtma holati','Статус заказа','Order status'),filters.status?label(filters.status):l('Barchasi','Все','All')]);
  sheet.addRow([l('To‘lov holati','Статус оплаты','Payment status'),filters.payment_status?label(filters.payment_status):l('Barchasi','Все','All')]);
  sheet.addRow([l('Sana: dan','Дата: с','Date from'),filters.date_from??'']);
  sheet.addRow([l('Gacha (shu kun ham)','По (включительно)','Through (inclusive)'),filters.date_to??'']);
  sheet.columns.forEach(c=>{c.width=23});sheet.getColumn(3).width=32;
  sheet.getRow(1).font={bold:true};sheet.getRow(1).alignment={wrapText:true};sheet.getRow(1).height=32;
  for(const column of [6,7,8,9]) sheet.getColumn(column).numFmt='#,##0.00';
  sheet.getColumn(5).numFmt='#,##0';sheet.getColumn(12).numFmt='dd.mm.yyyy hh:mm';
  sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:`L${lastData}`};
  return book;
}
