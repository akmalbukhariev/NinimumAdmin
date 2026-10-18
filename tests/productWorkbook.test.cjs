const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),Excel=require('exceljs');
const source=ts.transpileModule(fs.readFileSync('src/utils/productWorkbook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const ctx={exports:{}};new Function('exports','require',source)(ctx.exports,require);
const {collectProducts,createProductWorkbook}=ctx.exports;
test('collects all pages including a server-capped page size',async()=>{
 const calls=[];
 const rows=await collectProducts(async(page,size)=>{calls.push([page,size]);return {items:page===1?[{id:3},{id:2}]:[{id:1}],total:3,page,page_size:2};});
 assert.deepEqual(rows.map(r=>r.id),[3,2,1]);assert.deepEqual(calls,[[1,100],[2,100]]);
});
test('rejects changed totals, duplicate IDs and premature empty pages',async()=>{
 for(const last of [{items:[{id:1}],total:3},{items:[{id:2}],total:2},{items:[],total:2}]) {
  await assert.rejects(collectProducts(async(page)=>page===1?{items:[{id:2}],total:2}:last),/EXPORT_CHANGED/);
 }
});
test('empty results export cleanly; oversized exports fail explicitly',async()=>{
 assert.deepEqual(await collectProducts(async()=>({items:[],total:0})),[]);
 await assert.rejects(collectProducts(async()=>({items:[],total:50001})),/EXPORT_LIMIT/);
});
test('product XLSX preserves leading-zero identifiers and numeric zero/decimal values',async()=>{
 const book=await createProductWorkbook([{id:7,name:'Test',sku:'00007',barcode:'0012345678901',category_name:'Milk',price:'1200.50',subscription_price:0,stock_quantity:0,is_active:true},{id:8,name:'Inactive',price:10,subscription_price:null,stock_quantity:2,is_active:false}],(uz,ru,en)=>en);
 const loaded=new Excel.Workbook();await loaded.xlsx.load(await book.xlsx.writeBuffer());
 const sheet=loaded.getWorksheet('Products');
 assert.equal(sheet.getCell('C2').value,'00007');assert.equal(sheet.getCell('D2').value,'0012345678901');
 assert.equal(sheet.getCell('F2').value,1200.5);assert.equal(sheet.getCell('G2').value,0);assert.equal(sheet.getCell('H2').value,0);
 assert.equal(sheet.getCell('G3').value,null);assert.equal(sheet.getCell('I3').value,'Inactive');assert.equal(sheet.rowCount,3);
});
