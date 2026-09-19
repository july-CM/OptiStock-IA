import {originalFile} from './pilot-original';
import {createHash} from 'node:crypto';
type Store={prepare:(sql:string)=>any;exec:(sql:string)=>void};
export function weeklySnapshot(db:Store){return {
 shifts:db.prepare('SELECT * FROM pilot_shifts WHERE retired=0 ORDER BY id').all(),
 lines:db.prepare('SELECT * FROM pilot_lines WHERE shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0) ORDER BY id').all(),
 events:db.prepare('SELECT * FROM pilot_events WHERE shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0) ORDER BY id').all(),
 annulments:db.prepare('SELECT a.* FROM pilot_annulments a JOIN pilot_events e ON e.id=a.event_id WHERE e.shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0) ORDER BY a.event_id').all(),
 closures:db.prepare('SELECT * FROM pilot_closures WHERE shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0) ORDER BY shift_id').all(),
 counts:db.prepare('SELECT * FROM pilot_physical_counts WHERE shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0) ORDER BY line_id').all(),
 receipts:db.prepare('SELECT * FROM pilot_receipts WHERE shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0) ORDER BY shift_id').all()};}
export function weeklyPreview(db:Store,input:any,format='legacy'){
 if(!Array.isArray(input)||(!input.length&&format!=='optical')||input.length>10000)throw Error('El archivo no contiene cantidades válidas.');
 const products=db.prepare('SELECT * FROM products ORDER BY id').all(),lots=db.prepare('SELECT * FROM lots ORDER BY id').all();
 let rows:any[];
 if(format==='optical'){
  const seen=new Set<string>(),matched=new Map<string,any>();
  for(const r of input){const p=products.find((p:any)=>p.code===r.id);if(!p)throw Error('El ID «'+String(r.id)+'» no existe en el catálogo. No se agregan referencias desde esta carga.');if(seen.has(p.id))throw Error('ID repetido: '+p.code);seen.add(p.id);if(r.category!==p.category)throw Error('El ID «'+p.code+'» está en una hoja que no corresponde a su categoría.');if(typeof r.quantity!=='number'||!Number.isSafeInteger(r.quantity)||r.quantity<0||r.quantity>1000000||p.category==='Montura'&&r.quantity>1)throw Error('Cantidad inválida para '+p.code);if(p.category==='Montura'&&r.quantity!==(typeof r.state==='string'&&r.state.trim().toLowerCase().replace(/\s/g,'')==='disponible'?1:0))throw Error('El Estado no coincide con la existencia para '+p.code);matched.set(p.id,r);}
  rows=products.map((p:any)=>{const r=matched.get(p.id),med=p.category==='Medicamento',existing=lots.filter((l:any)=>l.product_id===p.id);if(med&&existing.length>1)throw Error('El medicamento '+p.code+' tiene varios lotes. Este archivo solo indica Stock por referencia; debe aclararse el lote antes de actualizar esa referencia.');const l=med?existing[0]:null;const before=l?.stock??p.stock,quantity=r?r.quantity:med?before:0;if(med&&!l&&quantity>0)throw Error('El medicamento '+p.code+' no tiene lote registrado. Configura su lote antes de actualizar el Stock.');return {productId:p.id,lotId:l?.id??null,code:p.code,name:p.name,lot:l?.number??null,before,quantity,difference:quantity-before,missing:!r,state:r?.state??'',rule:!r?med?'No apareció: se conserva Stock y lote actuales':'No apareció: existencia 0':med?'Stock del Excel; lote conservado':'Estado: '+r.state};});
 }else{
 const expected=products.flatMap((p:any)=>p.category==='Medicamento'?lots.filter((l:any)=>l.product_id===p.id).map((l:any)=>({p,l})): [{p,l:null}]);
 const seen=new Set<string>();
 rows=input.map((r:any)=>{const p=products.find((p:any)=>p.code===r.code);if(!p)throw Error('Código desconocido: '+String(r.code));
 const l=p.category==='Medicamento'?lots.find((l:any)=>l.product_id===p.id&&l.number===r.lot):null;
 if(p.category==='Medicamento'&&!l)throw Error('Lote desconocido o ausente para '+p.code+'. No se crean lotes en esta actualización.');
 const key=p.id+':'+(l?.id??'');if(seen.has(key))throw Error('Referencia / lote repetido: '+p.code);seen.add(key);
 if(typeof r.quantity!=='number'||!Number.isSafeInteger(r.quantity)||r.quantity<0||r.quantity>1000000)throw Error('Cantidad inválida para '+p.code);
 return {productId:p.id,lotId:l?.id??null,code:p.code,name:p.name,lot:l?.number??null,before:l?.stock??p.stock,quantity:r.quantity,difference:r.quantity-(l?.stock??p.stock)};}).sort((a:any,b:any)=>(a.productId+':'+a.lotId).localeCompare(b.productId+':'+b.lotId));
 if(rows.length!==expected.length||expected.some((e:any)=>!seen.has(e.p.id+':'+(e.l?.id??''))))throw Error('Incluye todas las referencias y lotes del catálogo. Descarga la plantilla actual para evitar omisiones.');
 }
 const snapshot=weeklySnapshot(db);
 const pending=snapshot.shifts.filter((s:any)=>!snapshot.receipts.some((r:any)=>r.shift_id===s.id)).map((s:any)=>({shiftId:s.id,day:s.day,status:snapshot.closures.some((c:any)=>c.shift_id===s.id)?'Pendiente de recepción':s.status,hasClosure:snapshot.closures.some((c:any)=>c.shift_id===s.id)}));
 const version=createHash('sha256').update(JSON.stringify({products,lots,snapshot,rows,format})).digest('hex');
 return {rows,version,references:new Set(rows.map((r:any)=>r.productId)).size,differences:rows.filter((r:any)=>r.difference!==0).length,cycles:snapshot.shifts.length,pending,missing:rows.filter((r:any)=>r.missing).map((r:any)=>r.code),increases:rows.filter((r:any)=>r.difference>0).length,decreases:rows.filter((r:any)=>r.difference<0).length,snapshot};
}
export function weeklyApply(db:Store,me:any,b:any){
 if(typeof b.requestId!=='string'||!b.requestId.trim()||b.requestId.length>80)throw Error('Identificador de actualización inválido.');
 if(b.format==='optical'&&!/\.xlsx$/i.test(b.filename??''))throw Error('La nueva base debe ser un archivo Excel .xlsx.');
 const original=originalFile(b.filename,b.originalBase64);
 const duplicate=db.prepare('SELECT actor,filename,quantities_json FROM pilot_weekly_updates WHERE id=?').get(b.requestId);
 if(duplicate){if(duplicate.actor!==me.id||duplicate.filename!==b.filename||(JSON.parse(duplicate.quantities_json).format??'legacy')!==(b.format??'legacy')||JSON.parse(duplicate.quantities_json).input!==JSON.stringify(b.rows))throw Error('Identificador ya utilizado con otro archivo.');const stored=db.prepare('SELECT sha256 FROM pilot_weekly_originals WHERE update_id=?').get(b.requestId);if(!stored||stored.sha256!==original.sha256)throw Error('El archivo original difiere de la carga ya confirmada.');return {ok:true,duplicate:true};}
 db.exec('BEGIN IMMEDIATE');try{
 const preview=weeklyPreview(db,b.rows,b.format);if(preview.version!==b.version)throw Error('Los datos cambiaron desde la revisión. Revisa el archivo nuevamente antes de confirmar.');
 if(preview.pending.length&&b.acknowledgePending!==true)throw Error('Reconoce la advertencia del turno pendiente para continuar con el archivo sin completar sus confirmaciones.');
 const createdAt=new Date().toISOString();
 if(typeof b.filename!=='string'||!b.filename.trim()||b.filename.length>255)throw Error('Nombre de archivo inválido.');
 db.prepare('INSERT INTO pilot_weekly_updates(id,actor,created_at,filename,snapshot_json,quantities_json) VALUES(?,?,?,?,?,?)').run(b.requestId,me.id,createdAt,b.filename,JSON.stringify(preview.snapshot),JSON.stringify({input:JSON.stringify(b.rows),format:b.format??'legacy',rows:preview.rows,pendingAcknowledgment:preview.pending.length?{actor:me.id,at:createdAt,turns:preview.pending}:null}));
 db.prepare('INSERT INTO pilot_weekly_originals(update_id,bytes,mime,sha256) VALUES(?,?,?,?)').run(b.requestId,original.bytes,original.mime,original.sha256);
 for(const s of preview.snapshot.shifts){db.prepare('INSERT INTO pilot_archived_shifts(shift_id,update_id) VALUES(?,?)').run(s.id,b.requestId);db.prepare('UPDATE pilot_shifts SET retired=1 WHERE id=?').run(s.id);}
 for(const r of preview.rows){if(r.lotId)db.prepare('UPDATE lots SET stock=? WHERE id=?').run(r.quantity,r.lotId);else db.prepare('UPDATE products SET stock=? WHERE id=?').run(r.quantity,r.productId);}
 for(const p of db.prepare("SELECT id FROM products WHERE category='Medicamento'").all())db.prepare('UPDATE products SET stock=(SELECT COALESCE(SUM(stock),0) FROM lots WHERE product_id=?) WHERE id=?').run(p.id,p.id);
 db.exec('COMMIT');return {ok:true};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
