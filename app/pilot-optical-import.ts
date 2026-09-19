export type OpticalRow={id:string;category:'Montura'|'Medicamento';quantity:number;state:string};
export const normalizeHeader=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function opticalRows(sheets:{name:string;rows:string[][]}[],filename:string){
 const result:OpticalRow[]=[],seen=new Set<string>();
 for(const [name,category] of [['monturas','Montura'],['medicamentos','Medicamento']] as const){
 const matches=sheets.filter(s=>normalizeHeader(s.name)===name);if(matches.length!==1)throw Error('Archivo «'+filename+'»: debe contener una hoja «'+(name==='monturas'?'Monturas':'Medicamentos')+'».');
 const sheet=matches[0],required=category==='Montura'?'estado':'stock';let mapping:{id:number;value:number}|null=null,headers=0;
 for(const [index,row] of sheet.rows.entries()){
  if(!row.some(v=>v.trim()))continue;
  const normalized=row.map(normalizeHeader),idIndex=normalized.indexOf('id');
  if(idIndex>=0){const value=normalized.indexOf(required);if(value<0)throw Error('Archivo «'+filename+'», hoja «'+sheet.name+'», fila '+(index+1)+': este bloque necesita los encabezados ID y '+(category==='Montura'?'Estado':'Stock')+'.');mapping={id:idIndex,value};headers++;continue;}
  if(!mapping)continue;
  const id=(row[mapping.id]??'').trim();
  if(!id){if(row.filter(v=>v.trim()).length<=1)continue;throw Error('Archivo «'+filename+'», hoja «'+sheet.name+'», fila '+(index+1)+': falta el ID de la referencia.');}
  // Los títulos de categoría entre bloques no son referencias.
  if(row.filter(v=>v.trim()).length===1&&!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+$/.test(id))continue;
  if(seen.has(id))throw Error('Archivo «'+filename+'», hoja «'+sheet.name+'», fila '+(index+1)+': ID repetido «'+id+'».');seen.add(id);
  const raw=(row[mapping.value]??'').trim();let quantity:number;
  if(category==='Montura')quantity=raw.toLowerCase().replace(/\s/g,'')==='disponible'?1:0;
  else{if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>1000000)throw Error('Archivo «'+filename+'», hoja «'+sheet.name+'», fila '+(index+1)+', ID «'+id+'»: Stock debe ser un entero entre 0 y 1.000.000.');quantity=Number(raw);}
  result.push({id,category,quantity,state:category==='Montura'?raw:''});
 }
 if(!headers)throw Error('Archivo «'+filename+'», hoja «'+sheet.name+'»: no se encontraron los encabezados ID y '+(category==='Montura'?'Estado':'Stock')+'.');
 }
 return result;
}
