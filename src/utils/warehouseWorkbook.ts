import type {Row} from '../api/managementApi';
import {dateTime} from './dateTime';
type L=(uz:string,ru:string,en:string)=>string;
type Column={key:string;title:string;number?:boolean;date?:boolean};
export async function createWarehouseWorkbook(tab:number,rows:Row[],l:L,label:(v:unknown)=>string,filters:Row={}) {
 const {Workbook}=await import('exceljs');const book=new Workbook();
 const name=[l('Qoldiq','Остатки','Stock'),l('Manzillar','Ячейки','Locations'),l('Kirimlar','Приходы','Receipts'),l('Harakatlar','Движения','Movements'),l('Tayyorlash','Подготовка','Preparation'),l('Xodimlar','Сотрудники','Workers')][tab];
 if(!name)throw new Error('Unknown warehouse export');
 const text=(key:string,title:string):Column=>({key,title});const num=(key:string,title:string):Column=>({key,title,number:true});const date=(key:string,title:string):Column=>({key,title,date:true});
 const columns:Column[][]=[
  [num('id','ID'),text('name',l('Mahsulot','Товар','Product')),text('sku','SKU'),text('barcode',l('Shtrix-kod','Штрихкод','Barcode')),num('stock_quantity',l('Sotuvga mavjud (dona)','Доступно для продажи (шт.)','Available to sell (pieces)'))],
  [num('id','ID'),text('path',l('Manzil','Ячейка','Location')),text('name',l('Nomi','Название','Name')),text('type',l('Turi','Тип','Type')),text('hierarchy_level',l('Daraja','Уровень','Level')),num('parent_id',l('Yuqori manzil ID','ID родительской ячейки','Parent ID'))],
  [num('id','ID'),text('supplier_name',l('Yetkazib beruvchi','Поставщик','Supplier')),text('invoice_number',l('Nakladnoy','Накладная','Invoice')),text('status',l('Holat','Статус','Status')),date('created_at',l('Yaratilgan (Toshkent)','Создано (Ташкент)','Created (Tashkent)')),text('created_by',l('Yaratdi','Создал','Created by')),text('posted_by',l('Tasdiqladi','Подтвердил','Approved by')),date('posted_at',l('Tasdiqlangan (Toshkent)','Подтверждено (Ташкент)','Approved (Tashkent)'))],
  [num('id','ID'),num('product_id',l('Mahsulot ID','ID товара','Product ID')),text('product_name',l('Mahsulot','Товар','Product')),text('kind',l('Harakat','Движение','Movement')),num('quantity_change',l('O‘zgarish (dona)','Изменение (шт.)','Change (pieces)')),num('stock_after',l('Keyingi qoldiq','Остаток после','Stock after')),text('reference',l('Asos','Основание','Reference')),text('actor',l('Kim','Кто','Actor')),text('note',l('Izoh','Примечание','Note')),date('created_at',l('Vaqt (Toshkent)','Время (Ташкент)','Time (Tashkent)'))],
  [num('id',l('Buyurtma ID','ID заказа','Order ID')),text('order_number',l('Buyurtma kodi','Код заказа','Order code')),text('preparation_status',l('Tayyorlash holati','Статус подготовки','Preparation status')),text('status',l('Buyurtma holati','Статус заказа','Order status')),text('worker_code',l('Xodim','Сотрудник','Worker')),date('ordered_at',l('Sana (Toshkent)','Дата (Ташкент)','Date (Tashkent)'))],
  [num('id','ID'),text('worker_code',l('Login','Логин','Login')),text('full_name',l('Ism','Имя','Name')),text('status',l('Holat','Статус','Status'))]
 ];
 const cols=columns[tab],sheet=book.addWorksheet(name);sheet.addRow(cols.map(c=>c.title));
 const enums=new Set(['type','hierarchy_level','status','kind','preparation_status']);
 for(const row of rows)sheet.addRow(cols.map(c=>{
  const value=row[c.key];if(value==null)return null;
  if(c.number){const n=Number(value);if(!Number.isFinite(n))throw new Error('Invalid numeric export');return n;}
  if(c.date){const match=/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(dateTime(value));return match?new Date(Date.UTC(+match[3],+match[2]-1,+match[1],+match[4],+match[5])):null;}
  return enums.has(c.key)?label(value):String(value);
 }));
 const end=sheet.rowCount;sheet.autoFilter={from:'A1',to:`${sheet.getColumn(cols.length).letter}${end}`};sheet.views=[{state:'frozen',ySplit:1}];
 sheet.columns.forEach((column,i)=>{column.width=26;if(cols[i].number)column.numFmt='#,##0';if(cols[i].date)column.numFmt='dd.mm.yyyy hh:mm'});sheet.getRow(1).font={bold:true};sheet.getRow(1).alignment={wrapText:true};sheet.getRow(1).height=34;
 sheet.addRow([]);sheet.addRow([l('Qidirish','Поиск','Search'),String(filters.search??'')]);sheet.addRow([l('Mahsulot filtri','Фильтр товара','Product filter'),String(filters.product??'')]);
 if(tab===3){sheet.addRow([l('Dan (Toshkent)','С (Ташкент)','From (Tashkent)'),String(filters.date_from??'')]);sheet.addRow([l('Gacha (shu kun ham)','По (включительно)','Through (inclusive)'),String(filters.date_to??'')]);}
 if(tab===0)sheet.addRow([l('Javon qoldiqlari emas; sotuvga mavjud mahsulotlar jami.','Это доступный для продажи остаток, не остаток по ячейкам.','Available product stock, not balances by bin.')]);
 return book;
}
