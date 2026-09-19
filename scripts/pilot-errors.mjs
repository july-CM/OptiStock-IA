export function userMessage(error){
 const message=typeof error?.message==='string'?error.message:'';
 if(/database is locked|SQLITE_BUSY/i.test(message))return 'El sistema está ocupado. Espera unos segundos y vuelve a intentar; tus datos no se han borrado.';
 if(error?.code||error?.name&&error.name!=='Error'||/constraint|sqlite|sql\b|database|syntax|no such|stack|undefined|null|not a function/i.test(message))return 'No se pudo completar la acción. Actualiza la pantalla y vuelve a intentar. Si continúa, pide ayuda al administrador.';
 if(/^(Completa|La |El |Los |Las |Solo |Ya |Selecciona|Fecha |Incluye|No |Referencia|Producto|Turno|Hay |Falta |Confirma|Reconoce|Identificador|Tipo |Cantidad|Código|Lote|Nombre|Archivo|Inicia|PIN|Configura|Cada |Espera|Demasiados|Usa |Ingresa|Este |Esta )/.test(message))return message;
 return 'No se pudo completar la acción. Revisa los datos e intenta nuevamente; si continúa, pide ayuda al administrador.';
}
