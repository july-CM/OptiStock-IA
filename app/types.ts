export type Product={frame_category?:string|null;entry_date?:string|null;id:string;code:string;name:string;category:string;brand:string;model:string;color:string;size:string;location:string;supplier:string;unit_price:number|null;unit:string;minimum:number;maximum:number;stock:number;last_event:string;created_at:string};
export type Lot={id:string;product_id:string;number:string;expiry:string;stock:number};
export type Account={email:string;name:string;role:'Administrador'|'Inventario'|'Consulta';active:number};
export type Movement={id:string;product_id:string;lot_id:string|null;kind:string;delta:number;before:number;after:number;note:string;actor:string;created_at:string;code:string;name:string;lot_number?:string};
export type Count={id:string;product_id:string;lot_id:string|null;frequency:string;period:string;expected:number;actual:number;actor:string;created_at:string;code:string;name:string;lot_number?:string};
export type Order={id:string;product_id:string;quantity:number;received:number;status:string;approved_by:string|null;created_at:string;code:string;name:string;supplier:string};
export type Snapshot={products:Product[];lots:Lot[];movements:Movement[];counts:Count[];orders:Order[];users:Account[];me:Account|null;canInitialize:boolean;authenticated:boolean;truncated:boolean};
export const categories=['Montura','Plaquetas','Cola de ratón','Parches','Cordones','Otro accesorio','Medicamento'];
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function weekStart(day=today()){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
export function dateLabel(value:string){return new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'});}
