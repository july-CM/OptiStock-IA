import {createInventoryHandlers} from './inventory';
type Bindings={DB:D1Database;ASSETS:{fetch:(request:Request)=>Promise<Response>}};
export default {async fetch(request:Request,env:Bindings):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname==='/api/inventory'){
  const email=request.headers.get('oai-authenticated-user-email'),userId=request.headers.get('oai-authenticated-user-id');
  let name=email??'';const raw=request.headers.get('oai-authenticated-user-full-name');if(raw&&request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(raw)}catch{}}
  const handlers=createInventoryHandlers(env.DB,email&&userId?{email,userId,displayName:name}:null);
  if(request.method==='GET')return handlers.GET(request);if(request.method==='POST')return handlers.POST(request);return new Response('Método no permitido',{status:405,headers:{Allow:'GET, POST'}});
 }
 const asset=await env.ASSETS.fetch(request);const headers=new Headers(asset.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');return new Response(asset.body,{status:asset.status,headers});
}};
