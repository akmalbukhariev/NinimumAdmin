const {test}=require('node:test'),assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),Excel=require('exceljs');
function load(path){const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const ctx={exports:{}};new Function('exports','require',source)(ctx.exports,id=>id==='./dateTime'?load('src/utils/dateTime.ts'):require(id));return ctx.exports;}
const {createAccountWorkbook}=load('src/utils/accountWorkbook.ts');
const l=(uz,ru,en)=>en,label=v=>({ACTIVE:'Active',INACTIVE:'Inactive',EXPIRED:'Expired'}[v]??v);
async function roundtrip(book){const result=new Excel.Workbook();await result.xlsx.load(await book.xlsx.writeBuffer());return result.worksheets[0];}
test('customer export preserves phone text, numeric filtered totals, profile values and date rollover',async()=>{
 const sheet=await roundtrip(await createAccountWorkbook('customers',[{id:14,first_name:'Test',last_name:'Customer',phone_number:'0012345',email:'test@example.com',address:'Test address',order_count:2,total_spent:'1000.10',is_active:false,created_at:'2026-10-16 19:00:00'},{id:15,first_name:'Мижоз',phone_number:'+998001234567',order_count:1,total_spent:'500.05',is_active:true}],l,label,{search:'Test',active:'false'}));
 assert.equal(sheet.getCell('C2').value,'0012345');assert.equal(sheet.getCell('C3').value,'+998001234567');assert.equal(sheet.getCell('D2').value,'test@example.com');assert.equal(sheet.getCell('E2').value,'Test address');
 assert.equal(sheet.getCell('G2').value,1000.1);assert.equal(sheet.getCell('G4').value.formula,'SUM(G2:G3)');assert.equal(sheet.getCell('G4').value.result,1500.15);assert.equal(sheet.getCell('F4').value.result,3);
 assert.equal(sheet.getCell('I2').value.toISOString(),'2026-10-17T00:00:00.000Z');assert.equal(sheet.getCell('I3').value,null);assert.equal(sheet.getCell('H2').value,'Inactive');assert.equal(sheet.getCell('B7').value,'Inactive');assert.equal(sheet.autoFilter,'A1:I3');
});
test('subscription export uses numeric tariff prices without claiming payment totals',async()=>{
 const sheet=await roundtrip(await createAccountWorkbook('subscriptions',[{id:3,user_id:14,customer_name:'Test',phone_number:'0012345',tariff_name:'Silver',monthly_price:'1234.50',status:'ACTIVE',start_date:'2026-10-01',end_date:'2026-11-01',auto_renew:0},{id:4,user_id:14,monthly_price:0,status:'EXPIRED',auto_renew:1}],l,label,{search:'Silver',status:'ACTIVE'}));
 assert.equal(sheet.getCell('D2').value,'0012345');assert.equal(sheet.getCell('F2').value,1234.5);assert.equal(sheet.getCell('F3').value,0);assert.equal(sheet.getCell('J2').value,'No');assert.equal(sheet.getCell('J3').value,'Yes');
 assert.equal(sheet.getCell('H2').value.toISOString(),'2026-10-01T05:00:00.000Z');assert.equal(sheet.getCell('H3').value,null);assert.equal(sheet.getCell('F4').value,null);assert.equal(sheet.getCell('B6').value,'Active');assert.equal(sheet.autoFilter,'A1:J3');
});
test('empty customer and subscription reports have headers and filter context without circular formulas',async()=>{
 for(const kind of ['customers','subscriptions']) {const sheet=await roundtrip(await createAccountWorkbook(kind,[],l,label));assert.equal(sheet.getCell('A1').value,'ID');assert.equal(sheet.getCell('A3').value,'Search');let formulas=0;sheet.eachRow(r=>r.eachCell(c=>{if(c.value&&c.value.formula)formulas++}));assert.equal(formulas,0);}
});
