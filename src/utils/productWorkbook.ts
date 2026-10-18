import type { PageData, Row } from '../api/managementApi';

// Reject incomplete/changing pagination rather than delivering a partial report.
export async function collectProducts(load: (page: number, size: number) => Promise<PageData>) {
  const rows: Row[] = [];
  const ids = new Set<string>();
  let total: number | undefined;
  for (let page = 1; ; page++) {
    const result = await load(page, 100);
    if (!Number.isInteger(result.total) || result.total < 0 || result.total > 50000) throw new Error('EXPORT_LIMIT');
    if (total === undefined) total = result.total;
    if (result.total !== total) throw new Error('EXPORT_CHANGED');
    for (const row of result.items) {
      const id = String(row.id);
      if (row.id == null || ids.has(id)) throw new Error('EXPORT_CHANGED');
      ids.add(id); rows.push(row);
    }
    if (rows.length === total) return rows;
    if (!result.items.length || rows.length > total) throw new Error('EXPORT_CHANGED');
  }
}

export async function createProductWorkbook(rows: Row[], l: (uz:string,ru:string,en:string)=>string) {
  const { Workbook } = await import('exceljs');
  const book = new Workbook();
  const sheet = book.addWorksheet(l('Mahsulotlar','Товары','Products'));
  sheet.addRow(['ID',l('Nomi','Название','Name'),'SKU',l('Shtrix-kod','Штрихкод','Barcode'),l('Kategoriya','Категория','Category'),l('Narx','Цена','Price'),l('Obuna narxi','Цена подписки','Subscription price'),l('Ombor','Остаток','Stock'),l('Holat','Статус','Status')]);
  for (const row of rows) sheet.addRow([row.id,row.name,String(row.sku ?? ''),String(row.barcode ?? ''),row.category_name ?? '',row.price == null ? null : Number(row.price),row.subscription_price == null ? null : Number(row.subscription_price),Number(row.stock_quantity ?? 0),row.is_active ? l('Faol','Активен','Active') : l('Faol emas','Неактивен','Inactive')]);
  sheet.columns.forEach(column => { column.width = 22; });
  sheet.getColumn(2).width = 38;
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {from:'A1',to:`I${Math.max(1,sheet.rowCount)}`};
  for (const column of [6,7]) sheet.getColumn(column).numFmt = '#,##0.00';
  sheet.getColumn(8).numFmt = '#,##0';
  return book;
}
