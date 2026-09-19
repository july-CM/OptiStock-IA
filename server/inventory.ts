import {categories,today,weekStart,type Product,type Lot,type Account,type Order} from '../app/types';
type Identity={email:string;displayName:string;userId:string};
export function createInventoryHandlers(binding:D1Database, currentUser:Identity|null){
async function getChatGPTUser(){return currentUser;}
class InputError extends Error {constructor(message:string,public status=400){super(message)}}
function db(){if(!binding)throw new Error('Database unavailable');return binding;}
function str(v:unknown,label:string,required=false,max=200){if(v==null&&!required)return '';if(typeof v!=='string'||v.length>max)throw new InputError(`${label}: valor inválido.`);const s=v.trim();if(required&&!s)throw new InputError(`${label} es obligatorio.`);return s;}
function num(v:unknown,label:string,min=0){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>1000000)throw new InputError(`${label}: usa un número entero entre ${min} y 1.000.000.`);return v;}
function validDay(v:unknown){const s=str(v,'Fecha',true,10);const date=new Date(s+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==s)throw new InputError('Fecha inválida.');return s;}
function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
async function identity(){const identity=await getChatGPTUser();if(!identity)throw new InputError('Inicia sesión para acceder a tu inventario.',401);return identity;}
async function account(){const i=await identity();const me=await db().prepare('SELECT * FROM users WHERE (email=? OR email=?) AND active=1').bind(i.email.toLowerCase(),i.userId).first<Account>();if(!me)throw new InputError('Tu cuenta no tiene permisos. Solicita acceso al administrador.',403);return me;}
function editor(a:Account){if(a.role==='Consulta')throw new InputError('Tu perfil permite consultar; no modificar el inventario.',403)}
function admin(a:Account){if(a.role!=='Administrador')throw new InputError('Esta acción requiere un administrador.',403)}
function handleError(e:unknown){if(e instanceof InputError)return response({error:e.message},e.status);console.error('Inventory request failed',e);if(String(e).includes('UNIQUE constraint'))return response({error:'Ya existe ese código o lote. Revisa los datos antes de continuar.'},409);return response({error:'No se pudo completar la operación. Tus datos no se han descartado; vuelve a intentarlo.'},503)}
function replenishment(productId:string,now:string){return [
 db().prepare(`UPDATE orders SET quantity=(SELECT maximum-stock FROM products WHERE id=?) WHERE product_id=? AND status='Pendiente' AND EXISTS(SELECT 1 FROM products WHERE id=? AND stock<=minimum AND maximum>stock)`).bind(productId,productId,productId),
 db().prepare(`UPDATE orders SET status='Cancelada' WHERE product_id=? AND status='Pendiente' AND EXISTS(SELECT 1 FROM products WHERE id=? AND (stock>minimum OR maximum<=stock))`).bind(productId,productId),
 db().prepare(`INSERT INTO orders(id,product_id,quantity,received,status,created_at) SELECT ?,id,maximum-stock,0,'Pendiente',? FROM products WHERE id=? AND stock<=minimum AND maximum>stock AND NOT EXISTS(SELECT 1 FROM orders WHERE product_id=? AND status IN ('Pendiente','Aprobada'))`).bind(crypto.randomUUID(),now,productId,productId)
]}
async function GET(request:Request){try{
 const i=await identity();const me=await db().prepare('SELECT * FROM users WHERE (email=? OR email=?) AND active=1').bind(i.email.toLowerCase(),i.userId).first<Account>();const initialized=await db().prepare("SELECT value FROM settings WHERE key='owner'").first();
 if(!me){if(initialized)throw new InputError('Tu cuenta no tiene permisos. Solicita acceso al administrador.',403);return response({products:[],lots:[],movements:[],counts:[],orders:[],users:[],me:null,canInitialize:true,authenticated:true,truncated:false});}
 const url=new URL(request.url);const from=validDay(url.searchParams.get('from')??weekStart());const to=validDay(url.searchParams.get('to')??today());if(from>to)throw new InputError('La fecha inicial debe ser anterior a la final.');const start=new Date(from+'T00:00:00-05:00').toISOString();const end=new Date(new Date(to+'T00:00:00-05:00').getTime()+86400000).toISOString();
 const r=await db().batch([
 db().prepare('SELECT * FROM products ORDER BY category,code'),db().prepare('SELECT * FROM lots ORDER BY expiry,number'),
 db().prepare(`SELECT m.*,p.code,p.name,l.number AS lot_number FROM movements m JOIN products p ON p.id=m.product_id LEFT JOIN lots l ON l.id=m.lot_id WHERE m.created_at>=? AND m.created_at<? ORDER BY m.created_at DESC LIMIT 10001`).bind(start,end),
 db().prepare(`SELECT c.*,p.code,p.name,l.number AS lot_number FROM counts c JOIN products p ON p.id=c.product_id LEFT JOIN lots l ON l.id=c.lot_id WHERE c.created_at>=? AND c.created_at<? ORDER BY c.created_at DESC LIMIT 10001`).bind(start,end),
 db().prepare('SELECT o.*,p.code,p.name,p.supplier FROM orders o JOIN products p ON p.id=o.product_id ORDER BY o.created_at DESC'),
 db().prepare(me.role==='Administrador'?'SELECT * FROM users ORDER BY role,email':'SELECT * FROM users WHERE 0')]);
 return response({products:r[0].results,lots:r[1].results,movements:r[2].results.slice(0,10000),counts:r[3].results.slice(0,10000),orders:r[4].results,users:r[5].results,me,canInitialize:false,authenticated:true,truncated:r[2].results.length>10000||r[3].results.length>10000});
 }catch(e){return handleError(e)}}
async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw new InputError('Solicitud inválida. Recarga la página.',403);
 if(Number(request.headers.get('content-length')??0)>1000000)throw new InputError('El archivo es demasiado grande.');
 const b=await request.json() as Record<string,unknown>;if(!b||typeof b!=='object'||Array.isArray(b))throw new InputError('Solicitud inválida.');const now=new Date().toISOString();
 if(b.action==='initialize'){
  const i=await identity();const email=i.email.toLowerCase();await db().batch([
   db().prepare("INSERT INTO settings(key,value) VALUES('owner',?) ON CONFLICT(key) DO NOTHING").bind(email),
   db().prepare("INSERT INTO users(email,name,role,active) SELECT ?,?,'Administrador',1 WHERE EXISTS(SELECT 1 FROM settings WHERE key='owner' AND value=?) ON CONFLICT(email) DO NOTHING").bind(email,i.displayName,email)
  ]);return response({ok:true});
 }
 const a=await account();
 if(b.action==='user'){admin(a);const email=b.userKey?str(b.userKey,'Identificador',true,254):b.email?str(b.email,'Correo',true,254).toLowerCase():crypto.randomUUID();if(b.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new InputError('Correo inválido.');if(b.userKey&&!await db().prepare('SELECT email FROM users WHERE email=?').bind(email).first())throw new InputError('Usuario no encontrado.',404);const name=str(b.name,'Nombre',true);const role=str(b.role,'Perfil',true);if(!['Administrador','Inventario','Consulta'].includes(role))throw new InputError('Perfil inválido.');const active=num(b.active,'Estado');if(active>1)throw new InputError('Estado inválido.');if(email===a.email&&(role!=='Administrador'||!active))throw new InputError('No puedes quitar tus propios permisos de administrador.');await db().prepare('INSERT INTO users(email,name,role,active) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,active=excluded.active').bind(email,name,role,active).run();return response({ok:true})}
 editor(a);
 if(b.action==='product'||b.action==='import'){
 const items=b.action==='import'?b.items:[b];if(!Array.isArray(items)||items.length<1||items.length>20)throw new InputError('Carga entre 1 y 20 productos por lote.');const statements:D1PreparedStatement[]=[];
 for(const item of items){if(!item||typeof item!=='object'||Array.isArray(item))throw new InputError('Producto inválido.');const code=str(item.code,'Código',true,80).toUpperCase();const name=str(item.name,'Nombre',true);const category=str(item.category,'Categoría',true);if(!categories.includes(category))throw new InputError('Categoría inválida.');const minimum=num(item.minimum,'Mínimo');const maximum=num(item.maximum,'Máximo');if(maximum<minimum)throw new InputError('El máximo debe ser mayor o igual al mínimo.');const id=crypto.randomUUID();const event=crypto.randomUUID();const stock=num(item.stock??0,'Existencias');const optional=['brand','model','color','size','location','supplier'].map(k=>str(item[k],k));
 let lotId:string|null=null;
 const lotNumber=category==='Medicamento'&&stock?str(item.lot,'Lote',true,80):'';const expiry=lotNumber?validDay(item.expiry):'';if(expiry&&expiry<today())throw new InputError('No puedes dar de alta existencias iniciales de un lote vencido.');
 statements.push(db().prepare('INSERT INTO products(id,code,name,category,minimum,maximum,stock,last_event,created_at,brand,model,color,size,location,supplier,unit_price,unit,frame_category,entry_date) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,code,name,category,minimum,maximum,stock,event,now,...optional,item.unitPrice==null?null:num(item.unitPrice,'Precio unitario'),str(item.unit??'Unidad','Unidad',true,40),item.frameCategory?str(item.frameCategory,'Categoría de montura',true,40):null,item.entryDate?validDay(item.entryDate):null));
 if(lotNumber){lotId=crypto.randomUUID();statements.push(db().prepare('INSERT INTO lots(id,product_id,number,expiry,stock) VALUES(?,?,?,?,?)').bind(lotId,id,lotNumber,expiry,stock))}
 statements.push(db().prepare('INSERT INTO movements(id,product_id,lot_id,kind,delta,before,after,note,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(event,id,lotId,'Inicial',stock,0,stock,'Existencias iniciales',a.email,now),...replenishment(id,now));}
 await db().batch(statements);return response({ok:true,imported:items.length});
 }
 const id=str(b.productId,'Producto',true,80);
 const p=await db().prepare('SELECT * FROM products WHERE id=?').bind(id).first<Product>();if(!p)throw new InputError('Producto no encontrado.',404);
 if(b.action==='thresholds'){admin(a);const minimum=num(b.minimum,'Mínimo');const maximum=num(b.maximum,'Máximo');if(maximum<minimum)throw new InputError('El máximo no puede ser inferior al mínimo.');await db().batch([db().prepare('UPDATE products SET minimum=?,maximum=?,supplier=?,location=? WHERE id=?').bind(minimum,maximum,str(b.supplier,'Proveedor'),str(b.location,'Ubicación'),p.id),...replenishment(p.id,now)]);return response({ok:true})}
 if(b.action==='approve'){admin(a);await db().prepare("UPDATE orders SET status='Aprobada',approved_by=? WHERE id=? AND product_id=? AND status='Pendiente'").bind(a.email,str(b.orderId,'Solicitud',true),p.id).run();return response({ok:true})}
 if(!['movement','count','receive'].includes(String(b.action)))throw new InputError('Acción desconocida.');
 let lot:Lot|null=null;let newLot=false;let lotId:string|null=null;
 let direction=b.action==='count'?'Conteo':b.action==='receive'?'Entrada':str(b.kind,'Tipo',true);
 if(b.action==='receive')direction='Entrada';if(!['Entrada','Salida','Conteo'].includes(direction))throw new InputError('Tipo de movimiento inválido.');
 if(p.category==='Medicamento'){
  if(b.lotId){lot=await db().prepare('SELECT * FROM lots WHERE id=? AND product_id=?').bind(str(b.lotId,'Lote',true),p.id).first<Lot>();if(!lot)throw new InputError('Selecciona un lote válido.');lotId=lot.id;}
  else if(direction==='Entrada'){const number=str(b.lot,'Lote',true,80);const expiry=validDay(b.expiry);if(expiry<today())throw new InputError('No puedes recibir un lote vencido.');lot=await db().prepare('SELECT * FROM lots WHERE product_id=? AND number=?').bind(p.id,number).first<Lot>();if(lot&&lot.expiry!==expiry)throw new InputError('Ese lote ya existe con otra fecha de vencimiento.');if(!lot){lot={id:crypto.randomUUID(),product_id:p.id,number,expiry,stock:0};newLot=true;}lotId=lot.id;}
  else throw new InputError('Selecciona el lote para este movimiento.');
 }
 const expected=lot?.stock??p.stock;const detail=str(b.note,'Motivo',true,500);const reason=direction==='Salida'?str(b.reason,'Motivo de salida',true,80):'';if(reason&&!['Venta o uso','Daño','Vencimiento','Devolución'].includes(reason))throw new InputError('Motivo de salida inválido.');const note=reason?reason+': '+detail:detail;const quantity=num(b.quantity,direction==='Conteo'?'Cantidad contada':'Cantidad',direction==='Conteo'?0:1);
 if(b.expected!==undefined&&num(b.expected,'Cantidad registrada')!==expected)throw new InputError('Las existencias cambiaron. Actualiza la página y repite el conteo.',409);
 if(direction==='Entrada'&&lot&&lot.expiry<today())throw new InputError('No puedes recibir un lote vencido.');
 if(direction==='Salida'&&lot&&lot.expiry<today()&&b.reason!=='Vencimiento')throw new InputError('El lote está vencido. Solo puedes retirarlo por vencimiento.');
 const delta=direction==='Conteo'?quantity-expected:direction==='Entrada'?quantity:-quantity;
 if(expected+delta<0||p.stock+delta<0)throw new InputError('No hay suficientes existencias.');
 let order:Order|null=null;
 if(b.action==='receive'){order=await db().prepare("SELECT * FROM orders WHERE id=? AND product_id=? AND status='Aprobada'").bind(str(b.orderId,'Solicitud',true),p.id).first<Order>();if(!order)throw new InputError('La solicitud debe estar aprobada antes de recibirla.');if(quantity>order.quantity-order.received)throw new InputError('La cantidad supera lo pendiente de recibir.');}
 const event=crypto.randomUUID();const statements:D1PreparedStatement[]=[];
 const where=order?" AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='Aprobada' AND received=?)":'';
 const args:unknown[]=[p.stock+delta,event,p.id,p.last_event];if(order)args.push(order.id,order.received);
 statements.push(db().prepare('UPDATE products SET stock=?,last_event=? WHERE id=? AND last_event=?'+where).bind(...args));
 if(newLot&&lot){statements.push(db().prepare('INSERT INTO lots(id,product_id,number,expiry,stock) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM products WHERE id=? AND last_event=?)').bind(lot.id,p.id,lot.number,lot.expiry,quantity,p.id,event))}
 else if(lot){statements.push(db().prepare('UPDATE lots SET stock=stock+? WHERE id=? AND EXISTS(SELECT 1 FROM products WHERE id=? AND last_event=?)').bind(delta,lot.id,p.id,event))}
 statements.push(db().prepare('INSERT INTO movements(id,product_id,lot_id,kind,delta,before,after,note,actor,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM products WHERE id=? AND last_event=?)').bind(event,p.id,lotId,direction,delta,p.stock,p.stock+delta,note,a.email,now,p.id,event));
 if(direction==='Conteo'){const frequency=str(b.frequency,'Frecuencia',true);if(!['Diario','Semanal'].includes(frequency))throw new InputError('Frecuencia inválida.');const period=frequency==='Diario'?today():weekStart();statements.push(db().prepare('INSERT INTO counts(id,product_id,lot_id,frequency,period,expected,actual,actor,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM products WHERE id=? AND last_event=?)').bind(event,p.id,lotId,frequency,period,expected,quantity,a.email,now,p.id,event));}
 if(order){statements.push(db().prepare("UPDATE orders SET received=received+?,status=CASE WHEN received+?=quantity THEN 'Recibida' ELSE 'Aprobada' END WHERE id=? AND EXISTS(SELECT 1 FROM products WHERE id=? AND last_event=?)").bind(quantity,quantity,order.id,p.id,event))}
 statements.push(...replenishment(p.id,now));const r=await db().batch(statements);if(!r[0].meta.changes)throw new InputError('Otro usuario modificó el producto. Actualiza y vuelve a intentar.',409);return response({ok:true});
 }catch(e){return handleError(e)}}

return {GET,POST};
}
