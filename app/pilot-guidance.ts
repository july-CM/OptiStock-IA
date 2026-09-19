import {activePilotShift} from './pilot-active';
import type {PilotData} from './pilot-types';
export function pilotGuidance(data:PilotData|null){
 const me=data?.me;if(!me||me.role==='Administrador')return null;
 const active=activePilotShift(data);
 const closed=data.closures.some(c=>c.shift_id===active?.id);
 if(me.role==='Habitual'){
  if(!active)return {step:1,target:'pilot-deliver',title:'Entregar el inventario inicial',hint:'Revisa cantidades y novedades; después confirma la entrega.'};
  if(closed)return {step:3,target:'pilot-closure',title:'Revisar y confirmar la recepción del cierre',hint:'Revisa diferencias, movimientos y novedades antes de confirmar.'};
  return {step:2,target:'pilot-turn',title:'Esperando al reemplazo',hint:active.status==='Entregado'?'El reemplazo debe recibir la entrega desde su sesión.':'El reemplazo está operando el turno. Podrás recibirlo cuando devuelva el cierre.'};
 }
 if(!active)return {step:1,target:'pilot-waiting',title:'Falta la entrega del equipo habitual',hint:'Pide a Julieth que entregue el inventario inicial desde su sesión.'};
 if(closed)return {step:3,target:'pilot-closure',title:'Revisar el resumen final y cerrar sesión',hint:'El cierre ya fue devuelto. Revisa el resumen antes de salir.'};
 if(active.status==='Entregado')return {step:1,target:'pilot-accept',title:'Confirmar recepción e iniciar turno',hint:'Revisa el inventario y las novedades entregadas antes de recibir.'};
 if(active.accepted_by!==me.id)return {step:2,target:'pilot-turn',title:'Turno recibido por otra persona',hint:'Las operaciones deben registrarse desde la sesión de quien recibió el turno.'};
 return {step:2,target:'pilot-operation',title:'Registrar ventas, devoluciones y ajustes',hint:'Registra cada movimiento con sus novedades. Al terminar, ve al conteo físico para devolver el turno.'};
}
