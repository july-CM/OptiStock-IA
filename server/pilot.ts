import {currentShift,retireShift} from './pilot-state';
export {getWeeklyOriginal,canManageWeekly} from './pilot-original';
import {canManageWeekly} from './pilot-original';
import {weeklyPreview,weeklyApply} from './pilot-weekly';
import type {PilotAccount} from '../app/pilot-types';
type Store={prepare:(sql:string)=>any;exec:(sql:string)=>void};
const text=(v:unknown,max=1000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Completa los campos obligatorios.');return v.trim()};
const quantity=(v:unknown)=>{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>1000000)throw Error('La cantidad debe ser un entero entre 0 y 1.000.000.');return v};
export function pilotData(db:Store,me:PilotAccount|null){
 const all=me?.role==='Administrador',visible=all?'1=1':'retired=0',related=all?'1=1':'shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0)';
 const latest=me?db.prepare('SELECT day,retired,EXISTS(SELECT 1 FROM pilot_receipts r WHERE r.shift_id=pilot_shifts.id) received FROM pilot_shifts ORDER BY delivered_at DESC LIMIT 1').get():null;
 return {currentShiftId:me?currentShift(db)?.id??null:null,lastTurnState:latest??null,setupRequired:db.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n===0,me,accounts:db.prepare('SELECT id,name,role FROM pilot_accounts').all(),archivedShiftIds:all?db.prepare('SELECT id FROM pilot_shifts WHERE retired=1').all().map((r:any)=>r.id):[],weeklyUpdates:canManageWeekly(me)?db.prepare('SELECT u.*,EXISTS(SELECT 1 FROM pilot_weekly_originals f WHERE f.update_id=u.id) AS hasOriginal FROM pilot_weekly_updates u WHERE u.actor=? ORDER BY u.created_at DESC').all(me!.id):[],...(me?{shifts:db.prepare('SELECT * FROM pilot_shifts WHERE '+visible+' ORDER BY day DESC').all(),lines:db.prepare('SELECT * FROM pilot_lines WHERE '+related).all(),events:db.prepare('SELECT e.*,a.created_at AS annulled_at,a.actor AS annulled_by,a.observations AS annulment_reason FROM pilot_events e LEFT JOIN pilot_annulments a ON a.event_id=e.id WHERE '+(all?'1=1':'e.shift_id IN (SELECT id FROM pilot_shifts WHERE retired=0)')+' ORDER BY e.created_at').all(),closures:db.prepare('SELECT * FROM pilot_closures WHERE '+related).all(),physicalCounts:db.prepare('SELECT * FROM pilot_physical_counts WHERE '+related).all(),receipts:db.prepare('SELECT * FROM pilot_receipts WHERE '+related).all(),products:db.prepare('SELECT * FROM products ORDER BY code').all(),lots:db.prepare('SELECT * FROM lots').all()}:{shifts:[],lines:[],events:[],closures:[],physicalCounts:[],receipts:[],products:[],lots:[]})};
}
export function pilotAction(db:Store,me:PilotAccount,b:any){
 const now=new Date().toISOString(),id=crypto.randomUUID();
 if(['weeklyPreview','weeklyApply'].includes(b.action)){if(!canManageWeekly(me))throw Error('Solo el administrador Daniela puede actualizar el inventario semanal.');if(b.action==='weeklyPreview'){const {snapshot,...preview}=weeklyPreview(db,b.rows,b.format);return preview;}return weeklyApply(db,me,b);}
 if(b.action==='resetTurn'){if(!canManageWeekly(me))throw Error('Solo Daniela puede reiniciar un turno.');const s=db.prepare('SELECT * FROM pilot_shifts WHERE id=? AND retired=0').get(text(b.shiftId,80));if(!s)throw Error('Turno no encontrado o ya archivado.');const reason=text(b.reason);db.exec('BEGIN IMMEDIATE');try{retireShift(db,s.id,me.id,reason);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return {ok:true};}
 if(b.action==='deliver'){
  if(me.role!=='Habitual')throw Error('Solo el equipo habitual puede entregar.');
  const day=text(b.day,10),d=new Date(day+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)throw Error('Fecha inválida.');
  const repeatedDate='Ya existe un turno registrado para esta fecha ('+day.split('-').reverse().join('/')+'). Si necesitas repetir la entrega de este día, pídele al administrador que lo reinicie primero.';
  const existing=db.prepare('SELECT * FROM pilot_shifts WHERE day=? AND retired=0').get(day);const incomplete=existing&&!db.prepare('SELECT id FROM pilot_lines WHERE shift_id=? LIMIT 1').get(existing.id);if(existing&&!incomplete)throw Error(repeatedDate);
  if(d.getUTCDay()!==0&&!b.holiday)throw Error('Selecciona un domingo o declara que es festivo.');
  const observations=text(b.observations);if(!Array.isArray(b.lines)||!b.lines.length||b.lines.length>10000)throw Error('Incluye las referencias entregadas.');
  const ongoing=currentShift(db);if(ongoing&&ongoing.id!==existing?.id)throw Error('Ya existe un turno activo. Termina su relevo antes de crear otro.');
  const seen=new Set();const lines=b.lines.map((l:any)=>{const p=db.prepare('SELECT * FROM products WHERE id=?').get(text(l.productId,80));if(!p)throw Error('Producto inválido.');const initial=quantity(l.quantity);let lot=null;if(p.category==='Medicamento'){lot=db.prepare('SELECT * FROM lots WHERE id=? AND product_id=?').get(text(l.lotId,80),p.id);if(!lot)throw Error('Selecciona el lote del medicamento.');if(initial>0&&lot.expiry<day)throw Error('No puedes entregar un lote vencido para el día del turno.');}const key=p.id+':'+(lot?.id??'');if(seen.has(key))throw Error('Referencia repetida en la entrega.');seen.add(key);return {p,lot,initial,note:typeof l.observations==='string'?l.observations.trim().slice(0,1000):''}});
  db.exec('BEGIN');try{if(incomplete)retireShift(db,existing.id,me.id,'Sustitución de entrega incompleta sin referencias');db.prepare('INSERT INTO pilot_shifts(id,day,holiday,observations,status,delivered_by,delivered_at) VALUES(?,?,?,?,?,?,?)').run(id,day,b.holiday?1:0,observations,'Entregado',me.id,now);const insert=db.prepare('INSERT INTO pilot_lines(id,shift_id,product_id,lot_id,code,name,lot_number,expiry,initial,balance,observations) VALUES(?,?,?,?,?,?,?,?,?,?,?)');for(const l of lines)insert.run(crypto.randomUUID(),id,l.p.id,l.lot?.id??null,l.p.code,l.p.name,l.lot?.number??null,l.lot?.expiry??null,l.initial,l.initial,l.note);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');if(/UNIQUE constraint failed: pilot_shifts.day/i.test(e instanceof Error?e.message:''))throw Error(repeatedDate);throw e}return {ok:true,id};
 }
 const shift=db.prepare('SELECT * FROM pilot_shifts WHERE id=?').get(text(b.shiftId,80));if(!shift)throw Error('Turno no encontrado.');if(shift.retired)throw Error('Este turno está archivado y no puede modificarse.');
 if(b.action==='accept'){if(me.role!=='Reemplazo'||shift.status!=='Entregado')throw Error('Solo el reemplazo puede recibir una entrega pendiente.');db.prepare("UPDATE pilot_shifts SET status='En curso',accepted_by=?,accepted_at=? WHERE id=? AND status='Entregado'").run(me.id,now,shift.id);return {ok:true};}
 const closure=db.prepare('SELECT * FROM pilot_closures WHERE shift_id=?').get(shift.id);
 if(b.action==='receiveClosure'){
  if(me.role!=='Habitual'||!closure)throw Error('Solo el equipo habitual puede recibir un cierre devuelto.');
  const observations=text(b.observations);
  if(db.prepare('SELECT shift_id FROM pilot_receipts WHERE shift_id=?').get(shift.id))return {ok:true,duplicate:true};
  db.prepare('INSERT INTO pilot_receipts(shift_id,received_by,received_at,observations) VALUES(?,?,?,?)').run(shift.id,me.id,now,observations);return {ok:true};
 }
 if(b.action==='close'){
  if(me.role!=='Reemplazo'||shift.status!=='En curso'||shift.accepted_by!==me.id)throw Error('Solo quien recibió el turno puede cerrar y devolverlo.');
  if(closure)return {ok:true,duplicate:true};
  if(b.reviewedCounts!==true)throw Error('Confirma que contaste y revisaste físicamente todas las referencias antes de devolver.');
  const observations=text(b.observations),lines=db.prepare('SELECT * FROM pilot_lines WHERE shift_id=?').all(shift.id);
  const n=db.prepare('SELECT COUNT(*) n FROM pilot_events WHERE shift_id=?').get(shift.id).n;
  const a=db.prepare('SELECT COUNT(*) n FROM pilot_annulments a JOIN pilot_events e ON e.id=a.event_id WHERE e.shift_id=?').get(shift.id).n;
  if(b.revision!==`${n}:${a}`)throw Error('Las operaciones cambiaron. Actualiza y revisa de nuevo el conteo y las diferencias.');
  if(!Array.isArray(b.counts)||b.counts.length!==lines.length||new Set(b.counts.map((c:any)=>c.lineId)).size!==lines.length)throw Error('Completa el conteo físico de todas las referencias.');
  const counts=lines.map((l:any)=>{const c=b.counts.find((c:any)=>c.lineId===l.id);if(!c||c.physical==null||c.physical==='')throw Error('Falta un conteo físico.');const physical=quantity(c.physical);if(c.expected!==l.balance)throw Error('El saldo cambió. Actualiza antes de devolver.');return {line:l,physical,difference:physical-l.balance}});
  const differences=counts.some((c:any)=>c.difference!==0);
  if(differences&&b.acknowledgeDifferences!==true)throw Error('Hay diferencias. Revisa la alerta y reconoce explícitamente que devuelves con diferencias pendientes.');
  const invalid=db.prepare("SELECT id FROM pilot_events WHERE shift_id=? AND (trim(observations)='' OR trim(kind)='' OR quantity<=0 OR trim(actor)='') LIMIT 1").get(shift.id);if(invalid)throw Error('Hay operaciones con campos obligatorios incompletos.');
  if(!shift.observations.trim()||!shift.delivered_by||!shift.accepted_by||!lines.length||lines.some((l:any)=>!l.product_id||!l.code.trim()||!l.name.trim()))throw Error('La entrega tiene campos obligatorios incompletos.');
  db.exec('BEGIN');try{db.prepare('INSERT INTO pilot_closures(shift_id,observations,returned_by,returned_at,acknowledged_by,acknowledged_at) VALUES(?,?,?,?,?,?)').run(shift.id,observations,me.id,now,differences?me.id:null,differences?now:null);const insert=db.prepare('INSERT INTO pilot_physical_counts(line_id,shift_id,system_balance,physical,difference) VALUES(?,?,?,?,?)');for(const c of counts)insert.run(c.line.id,shift.id,c.line.balance,c.physical,c.difference);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return {ok:true};
 }
 if(closure)throw Error('El turno ya fue devuelto. Sus operaciones y conteos están bloqueados.');
 if(b.action==='annul'){
  if(me.role!=='Reemplazo'||shift.status!=='En curso'||shift.accepted_by!==me.id)throw Error('Solo el reemplazo a cargo de un turno en curso puede anular.');
  const observations=text(b.observations),eventId=text(b.eventId,80);
  const event=db.prepare('SELECT * FROM pilot_events WHERE id=? AND shift_id=?').get(eventId,shift.id);if(!event)throw Error('Operación no encontrada en este turno.');
  if(db.prepare('SELECT event_id FROM pilot_annulments WHERE event_id=?').get(eventId))return {ok:true,id:eventId,duplicate:true};
  const line=db.prepare('SELECT * FROM pilot_lines WHERE id=?').get(event.line_id);
  const after=line.balance-(event.after_balance-event.before_balance);
  if(after<0||after>1000000)throw Error('Esta anulación dejaría un saldo inválido. Revisa o anula primero las operaciones posteriores que dependen de ella.');
  db.exec('BEGIN');try{db.prepare('INSERT INTO pilot_annulments(event_id,observations,actor,created_at,before_balance,after_balance) VALUES(?,?,?,?,?,?)').run(eventId,observations,me.id,now,line.balance,after);db.prepare('UPDATE pilot_lines SET balance=? WHERE id=?').run(after,line.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return {ok:true,id:eventId};
 }
 if(b.action==='event'){
  if(me.role!=='Reemplazo'||shift.status!=='En curso'||shift.accepted_by!==me.id)throw Error('Solo el reemplazo que recibió el turno puede registrar operaciones.');
  const requestId=text(b.requestId,80),kind=text(b.kind,30),observations=text(b.observations),q=quantity(b.quantity);if(q===0)throw Error('La cantidad debe ser mayor que cero.');if(!['Venta','Devolución','Ajuste positivo','Ajuste negativo'].includes(kind))throw Error('Tipo de operación inválido.');
  const line=db.prepare('SELECT * FROM pilot_lines WHERE id=? AND shift_id=?').get(text(b.lineId,80),shift.id);if(!line)throw Error('Referencia no entregada en este turno.');
  const duplicate=db.prepare('SELECT * FROM pilot_events WHERE request_id=?').get(requestId);if(duplicate){if(duplicate.actor!==me.id||duplicate.line_id!==line.id||duplicate.kind!==kind||duplicate.quantity!==q||duplicate.observations!==observations)throw Error('Identificador de operación ya utilizado con otros datos.');return {ok:true,id:duplicate.id,duplicate:true};}
  const recent=db.prepare('SELECT e.id FROM pilot_events e LEFT JOIN pilot_annulments a ON a.event_id=e.id WHERE e.shift_id=? AND e.line_id=? AND e.actor=? AND e.kind=? AND e.quantity=? AND e.observations=? AND e.created_at>=? AND a.event_id IS NULL ORDER BY e.created_at DESC LIMIT 1').get(shift.id,line.id,me.id,kind,q,observations,new Date(Date.now()-2000).toISOString());
  if(recent)return {ok:true,id:recent.id,duplicate:true};
  if(line.expiry&&line.expiry<shift.day)throw Error('Lote vencido: no puede operarse en este turno.');
  const delta=['Venta','Ajuste negativo'].includes(kind)?-q:q,after=line.balance+delta;if(after<0||after>1000000)throw Error('La operación deja un saldo inválido.');
  db.exec('BEGIN');try{db.prepare('UPDATE pilot_lines SET balance=? WHERE id=?').run(after,line.id);db.prepare('INSERT INTO pilot_events(id,request_id,shift_id,line_id,kind,quantity,before_balance,after_balance,observations,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,requestId,shift.id,line.id,kind,q,line.balance,after,observations,me.id,now);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return {ok:true,id};
 }
 throw Error('Acción no disponible en esta fase.');
}
