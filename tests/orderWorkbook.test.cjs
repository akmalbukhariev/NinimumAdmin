const {test}=require('node:test'),assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),Excel=require('exceljs');
function load(path){const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const module={exports:{}};new Function('exports','require',source)(module.exports,(id)=>id==='./dateTime'?load('src/utils/dateTime.ts'):require(id));return module.exports;}
const {createOrderWorkbook}=load('src/utils/orderWorkbook.ts');
const l=(uz,ru,en)=>en,label=value=>({PAID:'Paid',FAILED:'Failed',DELIVERED:'Delivered',PENDING:'Pending'}[value]??value);
test('orders XLSX preserves phone identifiers, numeric money, cached totals and Tashkent dates',async()=>{
 const rows=[{id:87,order_number:'ORD-87',customer_name:'Test',phone_number:'0012345',product_count:2,subtotal_price:'1000.10',delivery_price:'0.20',discount_price:'0.10',total_price:'1000.20',payment_status:'PAID',status:'DELIVERED',ordered_at:'2026-10-15 19:00:00'},{id:86,product_count:1,subtotal_price:'500.05',delivery_price:0,discount_price:0,total_price:'500.05',payment_status:'FAILED',status:'PENDING',ordered_at:'2026-10-16T18:59:00Z'}];
 const book=await createOrderWorkbook(rows,l,label,{search:'#87',payment_status:'PAID',date_from:'2026-10-16',date_to:'2026-10-16'});
 const roundtrip=new Excel.Workbook();await roundtrip.xlsx.load(await book.xlsx.writeBuffer());const sheet=roundtrip.getWorksheet('Orders');
 assert.equal(sheet.getCell('D2').value,'0012345');assert.equal(sheet.getCell('I2').value,1000.2);
 assert.equal(sheet.getCell('I4').value.formula,'SUM(I2:I3)');assert.equal(sheet.getCell('I4').value.result,1500.25);assert.equal(sheet.getCell('E4').value.result,3);
 assert.equal(sheet.getCell('L2').value.toISOString(),'2026-10-16T00:00:00.000Z');assert.equal(sheet.getCell('L3').value.toISOString(),'2026-10-16T23:59:00.000Z');
 assert.equal(sheet.getCell('J2').value,'Paid');assert.equal(sheet.getCell('K3').value,'Pending');
 assert.equal(sheet.getCell('B6').value,'#87');assert.equal(sheet.getCell('B8').value,'Paid');assert.equal(sheet.getCell('B10').value,'2026-10-16');assert.equal(sheet.autoFilter,'A1:L3');
});
test('empty orders workbook has no circular totals and missing dates remain blank',async()=>{
 const empty=await createOrderWorkbook([],l,label);assert.equal(empty.getWorksheet('Orders').getCell('I2').value,null);
 const unknown=await createOrderWorkbook([{id:1,payment_status:'PENDING',status:'PENDING',ordered_at:null}],l,label);
 assert.equal(unknown.getWorksheet('Orders').getCell('L2').value,null);
});
