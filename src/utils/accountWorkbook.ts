import type {Row} from '../api/managementApi';
import {dateTime} from './dateTime';
type Localize=(uz:string,ru:string,en:string)=>string;
function excelDate(value:unknown) {
 const m=/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(dateTime(value));
 return m?new Date(Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5])):null;
}
const number=(value:unknown)=>value==null||value===''?null:Number(value);
export async function createAccountWorkbook(kind:'customers'|'subscriptions',rows:Row[],l:Localize,label:(value:string)=>string,filters:Row={}) {
 const {Workbook}=await import('exceljs');const book=new Workbook();
 const customers=kind==='customers';const sheet=book.addWorksheet(customers?l('Mijozlar','Клиенты','Customers'):l('Obunalar','Подписки','Subscriptions'));
 if(customers) {
  sheet.addRow(['ID',l('Mijoz','Клиент','Customer'),l('Telefon','Телефон','Phone'),'Email',l('Manzil','Адрес','Address'),l('Buyurtmalar','Заказы','Orders'),l('Sarflangan (so‘m)','Потрачено (сум)','Spent (UZS)'),l('Holat','Статус','Status'),l('Ro‘yxatdan o‘tgan (Toshkent)','Регистрация (Ташкент)','Registered (Tashkent)')]);
  for(const r of rows)sheet.addRow([Number(r.id),[r.first_name,r.last_name].filter(Boolean).join(' '),String(r.phone_number??''),r.email??'',r.address??'',number(r.order_count),number(r.total_spent),label(r.is_active?'ACTIVE':'INACTIVE'),excelDate(r.created_at)]);
 } else {
  sheet.addRow(['ID',l('Mijoz ID','ID клиента','Customer ID'),l('Mijoz','Клиент','Customer'),l('Telefon','Телефон','Phone'),l('Tarif','Тариф','Tariff'),l('Tarif oylik narxi (so‘m)','Месячная цена тарифа (сум)','Tariff monthly price (UZS)'),l('Holat','Статус','Status'),l('Boshlanish (Toshkent)','Начало (Ташкент)','Start (Tashkent)'),l('Tugash (Toshkent)','Окончание (Ташкент)','End (Tashkent)'),l('Avtomatik uzaytirish','Автопродление','Auto-renew')]);
  for(const r of rows)sheet.addRow([Number(r.id),number(r.user_id),r.customer_name??'',String(r.phone_number??''),r.tariff_name??'',number(r.monthly_price),label(r.status),excelDate(r.start_date),excelDate(r.end_date),r.auto_renew?l('Ha','Да','Yes'):l('Yo‘q','Нет','No')]);
 }
 const last=sheet.rowCount;
 if(customers&&rows.length) {
  const total=sheet.addRow([l('Jami','Итого','Total')]);total.font={bold:true};
  for(const [column,key] of [[6,'order_count'],[7,'total_spent']] as const) total.getCell(column).value={formula:`SUM(${sheet.getColumn(column).letter}2:${sheet.getColumn(column).letter}${last})`,result:rows.reduce((sum,r)=>sum+Math.round(Number(r[key]??0)*100),0)/100};
 }
 sheet.addRow([]);sheet.addRow([l('Qidirish','Поиск','Search'),String(filters.search??'')]);
 sheet.addRow([l('Holat filtri','Фильтр статуса','Status filter'),customers?(filters.active===''||filters.active==null?l('Barchasi','Все','All'):label(String(filters.active)==='true'?'ACTIVE':'INACTIVE')):filters.status?label(filters.status):l('Barchasi','Все','All')]);
 if(customers)sheet.addRow([l('Sarflangan: to‘langan va bekor qilinmagan buyurtmalar; bu sof pul oqimi emas.','Потрачено: оплаченные, не отменённые заказы; это не чистый денежный поток.','Spent: paid, non-cancelled orders; this is not net cash flow.')]);
 else sheet.addRow([l('Tarif narxi amaldagi tarifdan olinadi; to‘lov tarixi emas.','Цена из текущего тарифа; это не история оплат.','Prices are from the current tariff, not payment history.')]);
 sheet.columns.forEach(c=>{c.width=24});sheet.getColumn(customers?2:3).width=34;
 sheet.getRow(1).font={bold:true};sheet.getRow(1).alignment={wrapText:true};sheet.getRow(1).height=34;
 sheet.getColumn(customers?7:6).numFmt='#,##0.00';
 for(const column of customers?[9]:[8,9])sheet.getColumn(column).numFmt='dd.mm.yyyy hh:mm';
 sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:`${customers?'I':'J'}${last}`};
 return book;
}
