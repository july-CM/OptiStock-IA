import assert from 'node:assert/strict';import {build} from 'rolldown';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
await build({input:'app/pilot-weekly.tsx',platform:'node',external:['react','react/jsx-runtime'],transform:{jsx:{runtime:'automatic'}},output:{dir:'work/weekly-ui-test',format:'esm',entryFileNames:'weekly.js',codeSplitting:false}});
const {default:Weekly,readWeeklyFile}=await import('../work/weekly-ui-test/weekly.js');
await assert.rejects(()=>readWeeklyFile(new File(['id,stock'],'antigua.csv')),/Excel real/);
const data={products:[],lots:[],accounts:[{id:'a',name:'Daniela Figueroa'}],weeklyUpdates:[{id:'archive',actor:'a',created_at:'2026-09-18T12:00:00Z',filename:'viernes.xlsx',hasOriginal:1,snapshot_json:JSON.stringify({shifts:[]}),quantities_json:JSON.stringify({rows:[]})}]};
const html=renderToStaticMarkup(createElement(Weekly,{data,refresh:async()=>data,onApplied:()=>{}}));assert(html.includes('Solo Daniela'));assert(html.includes('Historial de cargas de inventario'));assert(!html.includes('viernes.xlsx'));assert(html.includes('#semana-archive'));assert(html.includes('Cargar nueva base de datos para nuevo turno'));assert(!html.includes('Descargar plantilla'));assert(!html.includes('Revisar archivo Excel / CSV'));assert(!html.includes('Confirmar actualización y archivar ciclo'));assert(html.includes('18 de septiembre de 2026'));
console.log('PASS: direct optical Excel button, old CSV flow removed, history retained and no confirmation before review.');

for(const label of ['Ver base de datos cargada','Resumen integrador','Descargar original','Abrir archivo original','Auditoría de la actualización','Semana de la carga'])assert(!html.includes(label));
