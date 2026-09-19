import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/local-database.mjs';
import {localAccess} from '../scripts/pilot-access.mjs';
const {sqlite}=localDatabase(':memory:');
for(const [id,name] of [['a','Daniela Figueroa'],['h','Julieth Casanova'],['r','Carolina Rodriguez']])sqlite.prepare('INSERT INTO users(email,name,role,active) VALUES(?,?,?,1)').run(id,name,'Consulta');
const access=localAccess(sqlite);access.setup({'Daniela Figueroa':'135791','Julieth Casanova':'246802','Carolina Rodriguez':'369258'});
const token=access.login('r','369258'),req={headers:{cookie:'pilot_session='+token}};
const realNow=Date.now;let time=realNow();Date.now=()=>time;
try{time+=29*60000;assert(access.me(req));assert.match(access.cookie(req),/Max-Age=1800/);time+=2*60000;assert(access.me(req));time+=31*60000;assert.equal(access.me(req),null);assert.equal(access.cookie(req),null);}finally{Date.now=realNow;sqlite.close();}
console.log('PASS: sesión activa se renueva; tras 30 minutos de inactividad requiere identificación nuevamente.');
