import crypto from 'node:crypto';
export function localAccess(db,{secureCookies=false}={}){
 const sessions=new Map(),attempts=new Map();
 const account=id=>db.prepare('SELECT id,name,role FROM pilot_accounts WHERE id=?').get(id)??null;
 const hash=(pin,salt)=>crypto.scryptSync(pin,salt,64).toString('hex');
 function setup(pins){
  if(db.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n)throw Error('El acceso ya está configurado.');
  const people=[['Daniela Figueroa','Administrador'],['Julieth Casanova','Habitual'],['Carolina Rodriguez','Reemplazo']];
  if(!pins||people.some(([name])=>!/^\d{6,12}$/.test(pins[name]??'')))throw Error('Configura un PIN de 6 a 12 dígitos para cada persona.');
  if(new Set(Object.values(pins)).size!==3)throw Error('Cada persona debe tener un PIN diferente.');
  db.exec('BEGIN');try{for(const [name,role] of people){const original=db.prepare('SELECT email FROM users WHERE name=?').get(name);if(!original)throw Error('Falta el usuario '+name);const salt=crypto.randomBytes(16).toString('hex');db.prepare('INSERT INTO pilot_accounts(id,name,role,salt,pin_hash) VALUES(?,?,?,?,?)').run(original.email,name,role,salt,hash(pins[name],salt));}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 }
 function login(id,pin){const last=attempts.get(id);if(last?.blockedUntil>Date.now())throw Error('Demasiados intentos. Espera un minuto.');const row=db.prepare('SELECT * FROM pilot_accounts WHERE id=?').get(id);if(typeof pin!=='string'||!/^\d{6,12}$/.test(pin)||!row||!crypto.timingSafeEqual(Buffer.from(row.pin_hash,'hex'),Buffer.from(hash(pin,row.salt),'hex'))){const failures=(last?.failures??0)+1;attempts.set(id,{failures,blockedUntil:failures>=5?Date.now()+60000:0});throw Error('Nombre o PIN incorrecto.');}attempts.delete(id);const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{id,expires:Date.now()+1800000});return token;}
 function token(req){return /(?:^|;\s*)pilot_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'')?.[1]}
 function me(req){const key=token(req),s=sessions.get(key);if(!s||s.expires<Date.now()){sessions.delete(key);return null} s.expires=Date.now()+1800000;return account(s.id)}
 return {setup,login,me,cookie(req){const key=token(req);return key&&sessions.has(key)?`pilot_session=${key}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${secureCookies?'; Secure':''}`:null},logout(req){sessions.delete(token(req))}};
}
