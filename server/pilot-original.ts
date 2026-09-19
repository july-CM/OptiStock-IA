import {createHash} from 'node:crypto';
export const canManageWeekly=(me:any)=>me?.role==='Administrador'&&me?.name==='Daniela Figueroa';
export function originalFile(filename:unknown,base64:unknown){
 if(typeof filename!=='string'||!filename.trim()||filename.length>255||!(/\.(xlsx|csv)$/i.test(filename)))throw Error('Selecciona un archivo Excel .xlsx o CSV.');
 if(typeof base64!=='string'||!base64||base64.length>13333336||base64.length%4!==0||/[^A-Za-z0-9+/=]/.test(base64))throw Error('El archivo original está ausente o no es válido.');
 const bytes=Buffer.from(base64,'base64');if(bytes.toString('base64')!==base64)throw Error('El archivo original no es válido.');if(!bytes.length||bytes.length>10000000)throw Error('El archivo debe tener menos de 10 MB.');
 if(/\.xlsx$/i.test(filename)&&(bytes[0]!==80||bytes[1]!==75))throw Error('El archivo original no corresponde a Excel .xlsx.');
 return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),mime:/\.xlsx$/i.test(filename)?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'text/csv;charset=utf-8'};
}
export function getWeeklyOriginal(db:any,me:any,id:string){
 if(!canManageWeekly(me))throw Error('Solo Daniela puede consultar los archivos originales.');
 const file=db.prepare('SELECT f.*,u.filename,u.actor FROM pilot_weekly_originals f JOIN pilot_weekly_updates u ON u.id=f.update_id WHERE u.id=? AND u.actor=?').get(id,me.id);
 if(!file)throw Error('Archivo original no disponible para esta carga.');return file;
}
