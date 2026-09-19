# OPTICALIA OptiStock IA

## Piloto de relevo · Fase 2

El reemplazo revisa un conteo físico para cada referencia/lote entregado. Los campos proponen el saldo registrado y permanecen editables. Marcar todo como sin cambios rellena todas las referencias con sus saldos y reemplaza las correcciones manuales. El saldo ya incorpora los movimientos registrados; los valores propuestos no sustituyen el conteo real. Antes de devolver debe confirmarse explícitamente que se contaron y revisaron todas las referencias, incluidas las que tuvieron movimientos; el servidor exige esta confirmación, atribuida a quien devuelve y a su fecha/hora. Al cambiar conteos u operaciones se exige revisión nuevamente. La comparación muestra físico menos saldo registrado. El conteo se guarda en una tabla separada al devolver y nunca sobrescribe el saldo del turno ni el catálogo histórico. Novedades del cierre son obligatorias.

Antes de devolver, las referencias con diferencias se resaltan. El reemplazo debe reconocer explícitamente la alerta y decidir continuar con pendientes. El cierre conserva usuario y fecha/hora de ese reconocimiento, además de quién confirmó la devolución y cuándo. Si cambian las operaciones, anulaciones o conteos revisados, debe reconocerse de nuevo la alerta; el servidor rechaza una devolución basada en operaciones desactualizadas.

Después de devolver no se permiten movimientos ni anulaciones en ese turno. El equipo habitual inicia su propia sesión, revisa cantidades, novedades y diferencias y confirma recepción con observaciones obligatorias. Esta confirmación conserva usuario y fecha/hora propios, separados de la devolución. Supervisión consulta ambos registros. Un reintento no duplica ni modifica confirmaciones ya guardadas.

Los turnos anteriores pueden seleccionarse en Consultar turno. Descargar cierre CSV y Exportar relevos JSON incluyen saldos registrados, conteos físicos, diferencias, novedades y evidencia del reconocimiento y ambas confirmaciones. Una nueva entrega queda habilitada después de recibir el cierre; propone las cantidades físicas del último cierre recibido cuando hay coincidencia de referencia/lote, y siempre exige revisión de quien entrega.

Prueba aislada: `node tests/pilot-closure.mjs`. Las fases 3 (síntesis asistida) y 4 (indicadores y línea base manual) todavía están pendientes.

## Piloto de relevo · Fase 1

Uso en un solo equipo del mostrador, sin acceso remoto. La pantalla inicial permite configurar un PIN distinto de 6 a 12 dígitos para Daniela Figueroa (supervisión), Julieth Casanova (equipo habitual) y Carolina Rodriguez (reemplazo dominical/festivo). No existen PIN predeterminados ni se solicita correo. Los PIN se guardan mediante scrypt con sal individual; la sesión vence a los 30 minutos y al reiniciar el servidor. Cambiar de persona requiere salir e iniciar sesión nuevamente.

Julieth registra la entrega de un domingo o de un festivo declarado, con referencias, cantidades y novedades. Carolina revisa y recibe la entrega antes de usar el formulario único para ventas, devoluciones y ajustes. Cada operación exige novedades/observaciones y guarda responsable, fecha/hora y saldos. Daniela consulta las entregas y operaciones, y puede generar respaldos; no modifica los registros del piloto. Las operaciones del piloto no alteran el catálogo, los lotes ni el historial previo. El catálogo existente está disponible en consulta durante el piloto.

Descargar relevos JSON exporta entregas, responsables, cantidades, observaciones y operaciones. Descargar CSV exporta las operaciones del turno. Contingencia manual descarga un formulario HTML independiente para abrir sin servidor, completar, imprimir y exportar CSV. Debe descargarse antes del turno y sus datos deben guardarse antes de cerrar la página. No se importan automáticamente operaciones manuales para evitar duplicaciones.

SQLite persiste en `.sites-runtime/preview.sqlite`. Al iniciar el servidor se crea una copia consistente en `.sites-runtime/backups/`; Daniela puede crear otra con Guardar respaldo SQLite. Para restaurar: detener el servidor, conservar una copia de la base actual, reemplazar `preview.sqlite` por el respaldo seleccionado y reiniciar. Las exportaciones JSON son evidencias portables del piloto; no sustituyen el respaldo SQLite completo ni incluyen PIN.

La Fase 1 permite entrega, recepción y captura de un turno activo. Cierre, comparación física, devolución y confirmación se incorporarán en la Fase 2. La síntesis asistida con revisión humana corresponde a la Fase 3. La Fase 4 incluirá línea base manual de tiempo de conciliación y porcentaje de diferencias típicas, con fecha y responsable, además de los indicadores. Todavía no deben declararse relevos cerrados o metas cumplidas.

Verificación aislada: `node tests/pilot-smoke.mjs`. No carga datos de prueba en el inventario del mostrador.

Cada operación vigente del turno puede anularse por el reemplazo a cargo, con novedades/motivo obligatorio. El registro original no se borra ni se modifica: una tabla separada conserva motivo, usuario, fecha/hora y saldos de la anulación. Tabla, JSON y CSV muestran el original como Anulada. La anulación revierte su efecto sobre el saldo actual del turno y un reintento no lo revierte dos veces. Si revertir una devolución o ajuste positivo dejaría saldo negativo por operaciones posteriores, se indica que deben revisarse primero esas operaciones. Para corregir producto o cantidad: anular con motivo y registrar la operación correcta.

El guardado utiliza bloqueo inmediato de envíos en pantalla, deshabilita el formulario durante el procesamiento y conserva el identificador de reintento. Además, el servidor reconoce como repetición una operación idéntica del mismo responsable en la misma referencia dentro de dos segundos. Pruebas de exportación: `node tests/pilot-export.mjs`.

Aplicación para monturas oftálmicas, accesorios y medicamentos. Incluye entradas y salidas, conteos diarios y semanales, informes CSV, lotes y vencimientos, solicitudes automáticas de reposición, aprobación y recepción parcial de compras, y tres perfiles de usuario.

## Estado de entrega

La aplicación está implementada y se verificó con 512 referencias en una base de prueba. También se comprobaron permisos, conteos, salidas sin stock, lotes vencidos y recepción parcial de compras. Los datos de prueba no se cargan en el inventario de uso.

La publicación web está pendiente: Windows impide escribir el registro de versiones de este entorno, incluso después de conceder el permiso. El sitio privado registrado conserva su identidad para terminar la publicación posteriormente.

La vista previa local guarda datos en `.sites-runtime/preview.sqlite`. Su perfil de administrador es una simulación local y no constituye un sistema de acceso para producción. Solo escucha en 127.0.0.1. En la aplicación publicada, la identidad proviene del inicio de sesión de ChatGPT y los permisos se comprueban en el servidor.

El inventario local y su historial se vaciaron para cargar la base definitiva. Se conserva una copia recuperable de la base anterior en `.sites-runtime/backups/`. Los usuarios se mantienen.

## Uso

- Registrar cada combinación de montura con un código distinto.
- Pulsar Cargar Excel para seleccionar un archivo .xlsx, elegir su hoja y revisar las columnas antes de importar. Código, nombre y existencias son obligatorios. Se rechazan códigos duplicados; pueden cargarse las hojas por separado. No se guarda el archivo original, sino los productos importados.
- Descargar la plantilla CSV en el catálogo para cargar inventarios grandes. Las categorías válidas aparecen en la interfaz.
- Registrar un movimiento para cada entrada o salida. Los medicamentos requieren un lote.
- Guardar el conteo físico en Conteos. Si hay diferencias, indicar un motivo; el ajuste queda en el historial.
- Definir mínimos y máximos con el perfil administrador. Al alcanzar el mínimo se genera una solicitud hasta el máximo. Una compra aprobada mantiene su cantidad; la recepción puede ser parcial.
- El envío de pedidos al proveedor se realiza fuera de la aplicación; no se hacen pagos ni compras externas automáticamente.
- Los informes de existencias son saldos actuales. Movimientos y conteos se filtran por fechas; el CSV incluye todos los registros. La impresión muestra la página actual.

En producción, activar primero la cuenta de administrador mientras el sitio es privado. Después registrar correos y roles y compartir el sitio con las personas autorizadas desde sus opciones de acceso. Agregar un usuario no envía invitaciones.

## Ejecutar fuera de este entorno restringido

Requiere Node.js 24 y npm.

```text
npm ci
npm run build
npm run dev
```

La vista previa aparece en http://127.0.0.1:5173. La base local y el inventario publicado son independientes. Para verificar la lógica sin modificar datos de uso:

```text
node tests/inventory-smoke.mjs
```

El servidor de producción es un Worker compatible con Cloudflare, con persistencia D1. `.openai/hosting.json` conserva el sitio privado ya registrado. Los archivos `dist/` se generan mediante la compilación y las migraciones están en `drizzle/`. Los secretos de publicación no están incluidos.

La supervisión presenta un resumen de diferencias, movimientos (incluidas anulaciones) y novedades. El inventario íntegro queda plegado en «Ver inventario completo» y se conserva en las exportaciones. Tras devolver un cierre, el reemplazo revisa el mismo resumen y sale con «He revisado este resumen y es correcto, cerrar sesión»; el botón superior de salida conduce a esta revisión mientras su cierre esté pendiente de recepción. Esta revisión final es un paso de presentación y no añade ni modifica confirmaciones, conteos o registros guardados.

## Actualización semanal para el primer uso real

Daniela encuentra «Actualización semanal de inventario» en la pantalla de relevo. Descarga la plantilla semanal CSV, que utiliza las mismas columnas de la Plantilla CSV general y viene con los códigos y lotes actuales. Edita «existencias» y carga CSV o Excel .xlsx; en Excel se procesan las hojas con encabezados Código/ID y Existencias/Cantidad, y Lote para medicamentos. Cada referencia/lote debe estar presente exactamente una vez; no se agregan productos ni lotes. Otros campos del archivo no modifican el catálogo.

Antes de guardar se muestra el archivo, el número de referencias, las filas por lote, las diferencias frente al inventario base y el número de turnos que se archivarán. «Confirmar actualización y archivar ciclo» aplica todas las cantidades y el archivo del historial en una transacción. Si el inventario o el ciclo cambia desde la revisión, se rechaza la confirmación y debe revisarse el archivo nuevamente. Los reintentos de la misma confirmación no duplican la actualización.

Un turno pendiente debe cerrar y ser recibido antes de archivar. Los turnos archivados conservan sus tablas originales sin alteraciones y una copia completa de entregas, movimientos, anulaciones, cierres, conteos, diferencias y confirmaciones, asociada a la actualización con usuario, fecha/hora, nombre de archivo y cantidades anteriores/nuevas. Daniela puede consultar «Archivado» en el selector de turnos o descargar el archivo completo JSON del historial permanente. El API excluye el historial archivado para los demás roles y rechaza actualizaciones semanales de quien no sea Administrador. Los ciclos archivados no participan en el saldo propuesto de las nuevas entregas, que utiliza el inventario base actualizado. No existe borrado de archivos históricos en la interfaz. Se mantienen disponibles para la futura evaluación de indicadores del piloto.

Validación: `node tests/pilot-weekly.mjs`, `node tests/pilot-weekly-ui.mjs`, `node tests/pilot-smoke.mjs`, `node tests/pilot-closure.mjs` y comprobación de tipos. Las pruebas usan bases en memoria y no aplican cargas de ejemplo al inventario real.

### Archivos fuente de las cargas semanales

La carga semanal se limita específicamente a Daniela Figueroa con rol Administrador, tanto en la interfaz como en el servidor. Julieth, Carolina y cualquier otro perfil no ven la opción ni pueden aplicarla mediante el API. «Historial de cargas de inventario» se abre con un clic y muestra las cargas confirmadas por Daniela, con fecha/hora, archivo y responsable. «Abrir archivo original» presenta hojas y filas del archivo conservado; «Descargar original» devuelve exactamente sus bytes originales y nombre. La revisión permite seleccionar hojas y recorrer filas sin modificar el inventario.

Los archivos originales CSV/.xlsx (máximo 10 MB) se guardan en SQLite junto con su tipo y huella SHA-256, dentro de la misma transacción que confirma las cantidades y archiva el ciclo. Los respaldos SQLite incluyen los originales. La descarga exige sesión vigente de Daniela y propiedad de la carga; no hay enlaces públicos. El historial regular/exportaciones no incorpora los bytes de los archivos. Cargas canceladas o rechazadas no se añaden al historial de cargas confirmadas. Las cargas anteriores a esta función mantienen su historial y muestran explícitamente que el original no está disponible; nunca se reconstruye un archivo sustituto como si fuera el original.

### Guía visual del relevo

Julieth y Carolina ven una franja fija con «Paso 1/2/3 de 3», explicación de su acción o espera actual, barra de avance e «Ir a mi paso». Al entrar o avanzar de estado, la pantalla desplaza y enfoca la sección pendiente: entrega inicial, recepción del reemplazo, registro de operaciones, devolución/resumen final o recepción del equipo habitual. La sección se resalta con un borde turquesa. El reemplazo tiene acceso directo al conteo/cierre y regreso a operaciones. Consultar un turno histórico no provoca un salto automático; «Ir a mi paso» vuelve al turno actual. Los cambios son exclusivamente visuales y no crean ni modifican datos, permisos o confirmaciones.

Validación de estados: `node tests/pilot-guidance.mjs`. Prueba visual aislada con 40 referencias ficticias: salto a recepción, avance a registro, acceso al conteo/cierre, franja fija visible y sección resaltada. Sin PINs ni cambios de datos reales.

### Organización de Daniela por semanas y personas

En el relevo de Daniela la carga semanal es el primer contenido, antes del título y herramientas de supervisión. Debajo aparece una lista de fechas de carga. Seleccionar una fecha abre los originales y revisiones independientes «Movimientos de Julieth» (entrega, cantidades y novedades) y «Movimientos de Carolina» (recepción inicial, operaciones/anulaciones y cierre con conteo físico completo). Después se muestra el resumen integrador con diferencias, novedades, confirmaciones y reconocimiento de alertas. La lista general de turnos no vuelca los ciclos archivados; se consultan desde la fecha semanal.

La semana fuente comprende entregas cuyo registro ocurrió desde la carga de esa base hasta antes de la siguiente. Esto evita asociar a la nueva base el ciclo anterior que se archivó en el momento de cargarla. La copia del ciclo anterior y la auditoría de cantidades permanecen exportables dentro de la semana seleccionada. Una base todavía sin entregas muestra un mensaje y no inventa movimientos ni confirma cierres. No se cambian los datos guardados ni la aplicación de Julieth/Carolina.

Pruebas: `node tests/pilot-week-review.mjs` para límites temporales, separación de personas, anulaciones, conteos y confirmaciones; `node tests/pilot-weekly-ui.mjs`; comprobación de tipos. Prueba visual aislada con fechas ficticias confirmó el orden de carga/historial, selección de fecha y apertura independiente de la entrega.

### Mensajes y reinicio de una fecha de prueba

La entrega comprueba si la fecha ya está registrada y muestra su fecha en DD/MM/AAAA con indicación de solicitar reinicio al administrador. La colisión de unicidad en el momento de guardar también se traduce. El API del piloto traduce errores de base de datos, bloqueos y excepciones inesperadas a mensajes en español; no expone tablas ni mensajes técnicos. `node tests/pilot-errors.mjs` verifica fecha duplicada, conservación del registro y traducciones.

El 18/09/2026 se retiró únicamente el turno de prueba no archivado de esa fecha y sus dependencias, con copia SQLite anterior. Se verificaron sin cambios todas las demás filas, incluidas las cargas semanales y archivos originales. Los ciclos archivados no se borran mediante el procedimiento de reinicio puntual.

### Formato de plantilla y comprobación de ida y vuelta

«Descargar plantilla semanal CSV» genera CSV UTF-8 de una sola tabla, con monturas y medicamentos juntos. La pantalla lo explica junto a los botones. La carga admite ese CSV o un Excel .xlsx guardado realmente como libro de una o varias hojas; cada hoja con productos debe contener en la misma fila el código del catálogo y existencias/cantidad física, y los medicamentos requieren lote. El lector reconoce encabezados con acentos y aliases de código/cantidad. No se exige dividir el CSV en hojas ni renombrar su extensión.

Los mensajes de columnas faltantes identifican el nombre del archivo, si es CSV de tabla única o la hoja Excel exacta, cuáles columnas faltan, los encabezados encontrados y dónde agregarlas. Los errores de cantidad también señalan fila y columna. `node tests/pilot-weekly-roundtrip.mjs` captura el Blob real de csvDownload con el catálogo actual, lo reimporta sin cambiar encabezados y verifica la revisión en SQLite aislado; además valida los mismos encabezados en dos hojas Excel con una cantidad modificada y los errores específicos. No aplica cargas a la base real.

### Carga directa del Excel real de la óptica (flujo vigente)

Se sustituyó el flujo semanal de plantilla CSV por «Cargar nueva base de datos para nuevo turno», exclusivo de Daniela. La entrada nueva admite únicamente .xlsx con hojas Monturas y Medicamentos. Las cargas históricas CSV siguen conservadas y pueden abrirse/descargarse, pero ya no se requiere ni se ofrece plantilla semanal.

Monturas: procesa todos los bloques con encabezados repetidos ID/Estado, aunque cambie el orden de columnas entre bloques; empareja por ID del catálogo. Disponible sin distinción de mayúsculas ni espacios produce 1; cualquier otro estado produce 0. Toda montura del catálogo ausente del archivo se propone en 0. Medicamentos: ID/Stock; toma Stock directamente y conserva ID, número y vencimiento del lote registrado. Si falta un medicamento, señala la ausencia y conserva Stock actual en vez de inventar una cantidad; la pantalla lo explica. Si una referencia tiene múltiples lotes, se rechaza porque el Stock agregado no permite determinar a cuál asignarlo. Los ID nuevos, duplicados, de categoría incorrecta o Stock inválido se rechazan con contexto de archivo/hoja/fila cuando corresponde. No crea ni elimina referencias o lotes.

La revisión muestra todas las referencias, anterior/nuevo/diferencia, subidas/bajadas, lista de ID ausentes y regla de origen de cada cantidad. Solo la confirmación modifica cantidades base, conserva el archivo original, archiva el ciclo completo y libera la siguiente entrega. Se mantienen protección de versión, transacción, reintentos sin duplicar y bloqueo si hay un cierre pendiente de recepción. Historial por fechas y revisiones por persona siguen disponibles.

Validación vigente: `node tests/pilot-weekly-roundtrip.mjs` procesa un .xlsx con la estructura real de 15 y 10 columnas, bloques repetidos/reordenados, estados, faltantes, Stock y aplicación en memoria con ciclo completo, anulación y confirmaciones. `node tests/pilot-weekly-ui.mjs` comprueba desaparición del flujo anterior. El archivo real Inventario.xlsx fue leído con el nuevo lector y comparado contra una copia en memoria del catálogo: 40 monturas + 2 medicamentos, todos los ID coincidentes. No se aplicó esa carga a los datos reales.

### Advertencia no bloqueante para ciclos pendientes (comportamiento vigente)

La carga/revisión del Excel no se bloquea por turnos entregados, en curso o devueltos sin recepción habitual. La revisión muestra cada fecha pendiente, si también falta el cierre y que continuará archivándose exactamente así. Daniela elige «Esperar, sin aplicar cambios» o «Continuar de todas formas y archivar». La confirmación requiere reconocimiento explícito del aviso en el API, asociado a la revisión de versión vigente. Su decisión queda registrada en la auditoría de la carga con usuario/fecha/hora y los pendientes, sin generar cierres, recepciones ni aceptaciones. Los ciclos archivados quedan inmutables y excluidos del siguiente relevo. La copia completa refleja exactamente las confirmaciones existentes y ausentes.

Daniela conserva permiso de cargar base/archivar y consultar. No adquiere permiso para editar operaciones o conteos, aceptar una entrega, cerrar un turno ni confirmar recepción: continúan los permisos exclusivos de Habitual/Reemplazo. Los enlaces del historial semanal abren novedades, movimientos y confirmaciones del ciclo que usó esa base, incluyendo los pendientes reales. `node tests/pilot-weekly-pending.mjs` verifica los tres estados de pendiente, advertencia/reconocimiento, preservación exacta, ausencia de confirmaciones inventadas, límites administrativos y habilitación del nuevo ciclo. Las pruebas usan SQLite en memoria. No se archivó ni se cambió ningún turno real durante esta implementación.

### Historial simplificado de Daniela (vista vigente)

El historial muestra inicialmente solo enlaces de fechas, sin selección ni contenido desplegado. Al seleccionar una fecha (otra pulsación la oculta) aparecen únicamente dos secciones plegadas: «Ver base de datos cargada», visor de hojas/celdas de solo lectura, y «Resumen integrador», con faltantes y movimientos/novedades de Julieth y Carolina. Se eliminaron del historial las descargas del original/JSON, auditoría completa, metadatos de confirmaciones y las revisiones separadas anteriores. El visor carga al abrirse y permite solo cambiar hoja o página; no tiene celdas editables. Un cambio de fecha descarta el archivo visualizado anterior y evita mostrar resultados de una lectura anterior pendiente. Los archivos y la auditoría almacenados se conservan; las demás secciones y permisos permanecen iguales. Las herramientas de exportación/actualización/respaldo del relevo no cambiaron.

### Estado único del turno y reinicio de emergencia

El servidor publica `currentShiftId`: turno no archivado, con referencias entregadas y sin recepción final. La guía y el espacio de trabajo usan ese mismo identificador. La unicidad de fecha se aplica únicamente a turnos no archivados (`retired=0`), por lo que una fecha archivada puede reutilizarse sin borrar su historial. La migración 0008 marca como retirados los turnos que ya estaban en el archivo semanal, conservando todos sus valores originales. Una entrega sin referencias puede sustituirse por una entrega completa con evidencia de la recuperación.

Daniela dispone de «Reinicio de emergencia del turno», separado del historial de cargas: motivo obligatorio y reconocimiento previo. Archiva el turno tal como está, guarda una instantánea completa con usuario y fecha/hora y libera su fecha. No cambia cantidades base, lotes, cuentas/PINs, cargas semanales, operaciones originales ni confirmaciones; no inventa un cierre o una recepción. Las acciones sobre turnos retirados se rechazan. Julieth y Carolina no pueden reiniciar. `tests/pilot-current-state.mjs` verifica estado compartido, reutilización de fecha archivada, anulación preservada, permisos, reinicio repetido y recuperación de entrega incompleta.

## Repositorio y ejecución web

El repositorio contiene el código y las migraciones, **no** la base de datos real, los archivos Excel cargados ni los PIN. La estructura principal es: `app/` (interfaz y lectura Excel), `server/` (reglas, permisos e historial), `scripts/` (servidor, acceso y compilación), `db/` y `drizzle/` (modelo y migraciones), `tests/` (pruebas aisladas). Los PIN se guardan como hashes con sal en SQLite; nunca en el código.

Requisitos: Node.js 22.13 o posterior, almacenamiento persistente para SQLite y terminación HTTPS en el proveedor de alojamiento. Para construir y ejecutar:

```bash
npm ci
npm run build
OPTISTOCK_PUBLIC_ORIGIN=https://inventario.ejemplo.com OPTISTOCK_DB_PATH=/datos/optistock.sqlite PORT=5173 npm run start:web
```

`OPTISTOCK_PUBLIC_ORIGIN` debe ser la URL HTTPS exacta que usará el navegador. El proxy HTTPS debe conservar el encabezado `Host` público y dirigir las solicitudes al puerto de Node. El proceso escucha en `0.0.0.0` en modo web; configure la red del alojamiento para que el puerto interno solo sea accesible a través del proxy HTTPS. Las cookies de sesión usan `HttpOnly`, `SameSite=Strict` y `Secure`; las solicitudes de cambio requieren origen coincidente. Los respaldos automáticos y los iniciados por Daniela se escriben junto a la base, en `backups/`. Mantenga ese directorio en un volumen persistente y con copias externas según la política de la óptica.

Antes de poner el servicio a disposición de otras personas, configure los PIN de Daniela, Julieth y Carolina mediante el modo local (`npm run dev`) en una base privada y traslade una copia de esa base al volumen persistente del servidor. El alta inicial de PIN queda deshabilitada en modo web para impedir que un visitante se apropie de una base nueva. No copie `.sites-runtime/preview.sqlite` a GitHub ni agregue archivos `.sqlite`, `.xlsx` o `.csv` reales al repositorio. Los cambios de esquema se aplican al iniciar y se respalda la base antes de atender solicitudes. Un único proceso Node debe escribir en el archivo SQLite; no utilice varias réplicas apuntando al mismo archivo.

La publicación y el alojamiento aún requieren una cuenta GitHub autenticada y un proveedor con volumen persistente y HTTPS. Crear el repositorio no publica automáticamente la aplicación ni migra datos reales.
