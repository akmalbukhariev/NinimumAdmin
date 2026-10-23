const {test}=require('node:test'),assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs');
function load(path){const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const ctx={exports:{}};new Function('exports','require',source)(ctx.exports,require);return ctx.exports;}
const {canAccess,homePath,can}=load('src/auth/permissions.ts');
test('owner opens every page and lands on the dashboard',()=>{
 const owner={role:'SUPER_ADMIN'};for(const p of ['/dashboard','/settings','/customers','/order-timers'])assert.equal(canAccess(owner,p),true);assert.equal(homePath(owner),'/dashboard');
});
test('restricted admin from an older backend keeps the old five pages',()=>{
 const admin={role:'ADMIN'};assert.deepEqual(['/problems','/orders','/products','/categories','/delivery','/customers','/settings'].map(p=>canAccess(admin,p)),[true,true,true,true,true,false,false]);assert.equal(homePath(admin),'/orders');
});
test('staff pages follow permissions; edit includes view; settings stay owner-only',()=>{
 const purchasing={role:'ADMIN',permissions:['suppliers.edit','warehouse.edit','inventory.view']};
 assert.equal(canAccess(purchasing,'/suppliers'),true);assert.equal(canAccess(purchasing,'/inventory'),true);assert.equal(canAccess(purchasing,'/orders'),false);assert.equal(canAccess(purchasing,'/settings'),false);
 assert.equal(homePath(purchasing),'/warehouse');assert.equal(can(purchasing,'warehouse.view'),true);assert.equal(can(purchasing,'money.view'),false);
 assert.equal(canAccess({role:'WAREHOUSE',permissions:['orders.view']},'/orders'),false);
});
test('reports page opens with any report permission',()=>{
 assert.equal(canAccess({role:'ADMIN',permissions:['orders.view']},'/reports'),true);assert.equal(canAccess({role:'ADMIN',permissions:['subscriptions.edit']},'/reports'),true);
 assert.equal(canAccess({role:'ADMIN',permissions:['reviews.view','products.edit']},'/reports'),false);assert.equal(canAccess({role:'ADMIN'},'/reports'),false);
});
test('refunds page follows problem orders',()=>{
 assert.equal(canAccess({role:'ADMIN',permissions:['problems.view']},'/refunds'),true);assert.equal(canAccess({role:'ADMIN',permissions:['orders.view']},'/refunds'),false);
});
