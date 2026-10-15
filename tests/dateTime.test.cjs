const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const output = ts.transpileModule(fs.readFileSync('src/utils/dateTime.ts','utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
const context = {exports:{},Intl,Date};
vm.runInNewContext(output,context);
const {dateTime} = context.exports;
test('UTC is converted to Tashkent rather than the browser timezone',()=>{
  assert.equal(dateTime('2026-10-14T11:40:33Z'),'14.10.2026 16:40');
});
test('legacy SQL timestamps use the same backend UTC convention',()=>{
  assert.equal(dateTime('2026-10-14 11:40:33'),'14.10.2026 16:40');
});
test('explicit offsets preserve their actual instant',()=>{
  assert.equal(dateTime('2026-10-14T16:40:33+05:00'),'14.10.2026 16:40');
  assert.equal(dateTime('2026-10-14T20:40:33+09:00'),'14.10.2026 16:40');
});
test('epoch milliseconds, seconds and numeric strings agree',()=>{
  const epoch=Date.parse('2026-10-14T11:40:33Z');
  for(const value of [epoch,epoch/1000,String(epoch),String(epoch/1000)])
    assert.equal(dateTime(value),'14.10.2026 16:40');
});
test('timezone conversion rolls date and year correctly',()=>{
  assert.equal(dateTime('2026-12-31T21:30:00Z'),'01.01.2027 02:30');
});
test('midnight uses 00 rather than 24',()=>{
  assert.equal(dateTime('2026-10-14T19:00:00Z'),'15.10.2026 00:00');
});
test('date-only subscription values remain visible',()=>{
  assert.equal(dateTime('2026-10-14'),'14.10.2026 05:00');
});
test('missing and malformed values are harmless',()=>{
  for(const value of [null,undefined,'','invalid',NaN,Infinity,'2026-13-40 99:99:99'])
    assert.equal(dateTime(value),'—');
});
