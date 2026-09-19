import {userMessage} from './pilot-errors.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import worker from '../dist/server/index.js';
import {localDatabase} from './local-database.mjs';
import {pilotData,pilotAction,getWeeklyOriginal,canManageWeekly} from '../dist/pilot/pilot.js';
import {localAccess} from './pilot-access.mjs';
const webMode=process.env.OPTISTOCK_WEB_MODE==='1';
const publicOrigin=webMode?new URL(process.env.OPTISTOCK_PUBLIC_ORIGIN).origin:'http://127.0.0.1:5173';
const bindHost=webMode?(process.env.OPTISTOCK_HOST||'0.0.0.0'):'127.0.0.1';
const port=webMode?Number(process.env.PORT||5173):5173;
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Puerto inválido.');
const dataPath=path.resolve(webMode?(process.env.OPTISTOCK_DB_PATH||'.sites-runtime/optistock.sqlite'):'.sites-runtime/preview.sqlite');
await fs.mkdir(path.dirname(dataPath),{recursive:true});
const {DB,sqlite}=localDatabase(dataPath);
const backupDir=path.join(path.dirname(dataPath),'backups');
await fs.mkdir(backupDir,{recursive:true});
sqlite.prepare('VACUUM INTO ?').run(path.join(backupDir,'automatico-'+Date.now()+'.sqlite'));
const access=localAccess(sqlite,{secureCookies:webMode});
const root=path.resolve('dist/client');
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,publicOrigin);
 if(req.headers.host!==new URL(publicOrigin).host){res.writeHead(403);res.end();return}
 const me=access.me(req);
 if(url.pathname.startsWith('/api/pilot')){
  const send=(data,status=200,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(me&&access.cookie(req)?{'Set-Cookie':access.cookie(req)}:{}),...headers});res.end(JSON.stringify(data))};
  try{
   if(req.method==='GET'){
    if(url.pathname.startsWith('/api/pilot/original/')){
     if(!me)return send({error:'Inicia sesión.'},401);
     if(!canManageWeekly(me))return send({error:'Solo Daniela puede consultar los archivos originales.'},403);
     let file;try{file=getWeeklyOriginal(sqlite,me,decodeURIComponent(url.pathname.slice('/api/pilot/original/'.length)));}catch(e){return send({error:userMessage(e)},404);}
     const disposition=url.searchParams.get('download')==='1'?'attachment':'inline';
     res.writeHead(200,{'Content-Type':file.mime,'Content-Length':file.bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':disposition+"; filename*=UTF-8''"+encodeURIComponent(file.filename),...(access.cookie(req)?{'Set-Cookie':access.cookie(req)}:{})});res.end(Buffer.from(file.bytes));return;
    }
    if(url.pathname==='/api/pilot/export'){if(!me)return send({error:'Inicia sesión.'},401);return send({...pilotData(sqlite,me),format:'optistock-pilot-v1',exportedAt:new Date().toISOString()},200,{'Content-Disposition':'attachment; filename="relevos-piloto.json"'});}
    return send(pilotData(sqlite,me));
   }
   if(req.method!=='POST')return send({error:'Método no permitido.'},405);
   if(req.headers.origin!==url.origin)return send({error:'Origen no permitido.'},403);
   let body='',bytes=0;for await(const part of req){bytes+=part.length;if(bytes>16000000)return send({error:'Archivo demasiado grande.'},413);body+=part.toString()}const b=JSON.parse(body);
   if(b.action==='setup'){if(webMode)return send({error:'Configura los accesos en el equipo local antes de publicar la base.'},403);access.setup(b.pins);return send({ok:true})}
   if(b.action==='login'){const token=access.login(b.id,b.pin);return send({ok:true},200,{'Set-Cookie':`pilot_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${webMode?'; Secure':''}`})}
   if(b.action==='logout'){access.logout(req);return send({ok:true},200,{'Set-Cookie':`pilot_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${webMode?'; Secure':''}`})}
   if(!me)return send({error:'Inicia sesión para continuar.'},401);
   if(b.action==='backup'){if(me.role!=='Administrador')return send({error:'Solo administración puede respaldar.'},403);const name='respaldo-piloto-'+Date.now()+'.sqlite';sqlite.prepare('VACUUM INTO ?').run(path.join(backupDir,name));return send({ok:true,file:name})}
   return send(pilotAction(sqlite,me,b));
  }catch(e){return send({error:userMessage(e)},400)}
 }
 if(url.pathname==='/signin-with-chatgpt'||url.pathname==='/signout-with-chatgpt'){res.writeHead(302,{Location:'/'});res.end();return}
 if(url.pathname==='/api/inventory'){
  if(!me){res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Inicia sesión en el piloto.'}));return}
  if(req.method!=='GET'){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'El inventario histórico está en consulta durante el piloto. Usa el formulario del turno.'}));return}
  const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>1000000){res.writeHead(413);res.end();return}chunks.push(chunk)}
  const headers=new Headers();headers.set('Content-Type','application/json');headers.set('oai-authenticated-user-id',me.id);headers.set('oai-authenticated-user-email',me.id);headers.set('oai-authenticated-user-full-name',encodeURIComponent(me.name));headers.set('oai-authenticated-user-full-name-encoding','percent-encoded-utf-8');
  const request=new Request(url,{method:req.method,headers,body:req.method==='POST'?Buffer.concat(chunks):undefined});const response=await worker.fetch(request,{DB,ASSETS:{fetch:async()=>new Response('')}});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
 }
 let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return}if(file===root)file=path.join(root,'index.html');
 let data=await fs.readFile(file);if(!webMode&&path.extname(file)==='.html')data=Buffer.from(data.toString().replace('<body>','<body><div style="padding:12px 20px;background:#fff2cf;color:#755616;font:14px Segoe UI,sans-serif">Vista previa local · Datos guardados en este equipo. Publicación web pendiente.</div>'));const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('No encontrado')}});
server.listen(port,bindHost,()=>console.log(webMode?'Web: '+publicOrigin:'Local: '+publicOrigin));

