export function currentShift(db:any){return db.prepare('SELECT s.* FROM pilot_shifts s WHERE s.retired=0 AND EXISTS(SELECT 1 FROM pilot_lines l WHERE l.shift_id=s.id) AND NOT EXISTS(SELECT 1 FROM pilot_receipts r WHERE r.shift_id=s.id) ORDER BY s.delivered_at DESC LIMIT 1').get();}
export function retireShift(db:any,id:string,actor:string,reason:string){
 const snapshot:any={};for(const table of ['pilot_shifts','pilot_lines','pilot_events','pilot_closures','pilot_physical_counts','pilot_receipts'])snapshot[table]=db.prepare('SELECT * FROM '+table+' WHERE '+(table==='pilot_shifts'?'id':'shift_id')+'=?').all(id);
 snapshot.pilot_annulments=db.prepare('SELECT a.* FROM pilot_annulments a JOIN pilot_events e ON e.id=a.event_id WHERE e.shift_id=?').all(id);
 db.prepare('INSERT INTO pilot_resets VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),id,actor,new Date().toISOString(),reason,JSON.stringify(snapshot));db.prepare('UPDATE pilot_shifts SET retired=1 WHERE id=?').run(id);
}
