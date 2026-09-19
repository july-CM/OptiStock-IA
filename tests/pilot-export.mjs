import assert from 'node:assert/strict';
import {build} from 'rolldown';
await build({input:'app/pilot-export.ts',platform:'node',output:{dir:'work/export-test',format:'esm',entryFileNames:'export.js'}});
const {operationRows}=await import('../work/export-test/export.js');
const event={id:'e',line_id:'l',kind:'Venta',quantity:1,before_balance:2,after_balance:1,actor:'r',observations:'Venta original.',created_at:'2026-09-20T12:00:00Z',annulled_at:'2026-09-20T12:05:00Z',annulled_by:'r',annulment_reason:'Venta duplicada.'};
const rows=operationRows('2026-09-20',[event],[{id:'l',code:'FRAME',name:'Montura'}],()=> 'Carolina Rodriguez');
assert.equal(rows.length,2);assert.equal(rows[1][10],'Venta original.');assert.equal(rows[1][11],'Anulada');assert.equal(rows[1][12],'Venta duplicada.');assert.equal(rows[1][13],'Carolina Rodriguez');assert.equal(rows[1][14],event.annulled_at);
assert.equal(operationRows('2026-09-20',[{...event,annulled_at:null,annulment_reason:null,annulled_by:null}],[],()=> 'Carolina')[1][11],'Vigente');
console.log('PASS: CSV conserva el original, estado, motivo, responsable y fecha de anulación.');
