const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
const Excel=require('exceljs');
const source=ts.transpileModule(fs.readFileSync('src/utils/supplierWorkbook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const ctx={exports:{}};new Function('exports','require',source)(ctx.exports,require);
test('supplier Excel preserves numeric amounts, invoice links and void history',async()=>{
 const book=await ctx.exports.createSupplierWorkbook({id:1,name:'Supplier test',outstanding_amount:'600.00',invoices:[{receipt_id:3,invoice_number:'INV-1',invoice_date:'2026-10-01',due_date:'2026-10-08',status:'POSTED',invoice_amount:'1000.00',outstanding_amount:'600.00'}],payments:[{receipt_id:3,paid_date:'2026-10-02',reference:'BANK-1',amount:'400.00',status:'RECORDED',created_by:'OWNER'},{receipt_id:3,paid_date:'2026-10-02',reference:'BANK-VOID',amount:'100.00',status:'VOID',void_reason:'Correction',created_by:'OWNER'}]},(uz,ru,en)=>en);
 const loaded=new Excel.Workbook();await loaded.xlsx.load(await book.xlsx.writeBuffer());
 const receipts=loaded.getWorksheet('Receipts'),payments=loaded.getWorksheet('Payment records');
 assert.equal(receipts.getCell('C1').value,600);
 assert.equal(receipts.getCell('F3').value,1000);assert.equal(receipts.getCell('G3').value,600);
 assert.equal(payments.getCell('D2').value,400);assert.equal(payments.getCell('E3').value,'VOID');assert.equal(payments.getCell('G3').value,'Correction');
 assert.equal(loaded.worksheets.length,2);
});
