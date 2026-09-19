# OPTICALIA OptiStock IA

Aplicación web de inventario para monturas y medicamentos de una óptica. Incluye un piloto de relevo de domingo/festivo y actualización semanal desde el Excel de la óptica.

## Qué hace

- Tres sesiones con PIN individual: Daniela (administración), Julieth (equipo habitual) y Carolina (reemplazo). Los PIN se guardan con `scrypt` y sal individual. No se guardan en GitHub.
- Entrega de inventario, recepción del reemplazo, ventas/devoluciones/ajustes con observaciones y anulación auditable.
- Cierre con conteo físico editable, diferencias por referencia y confirmaciones separadas de entrega y recepción.
- Carga semanal del Excel real, revisión previa de cambios, historial de cargas y archivo íntegro de cada ciclo.
- Persistencia SQLite, migraciones versionadas y respaldos automáticos al iniciar.

## Estructura

| Carpeta | Función |
| --- | --- |
| `app/` | Pantallas, formularios y lectura de Excel |
| `server/` | Reglas de negocio, permisos, turnos e historial |
| `scripts/` | Servidor HTTP, acceso por PIN y compilación |
| `db/`, `drizzle/` | Modelo y migraciones SQLite |
| `tests/` | Pruebas aisladas con bases temporales |

El archivo `OptiStock-IA-source.zip` contiene el mismo proyecto en una descarga única. Los archivos fuente también se pueden revisar por carpeta en el repositorio.

## Ejecutar en el equipo local

Requiere Node.js 22.13 o posterior y npm.

```bash
npm ci
npm run build
npm run dev
```

Abra `http://127.0.0.1:5173`. El modo local usa `.sites-runtime/preview.sqlite`. Si es una instalación nueva, configure una vez los tres PIN desde esta pantalla. El servidor local solo escucha en este equipo.

## Preparar un servidor web

Use un alojamiento con Node.js, volumen persistente y HTTPS. Configure la base SQLite y los PIN **antes** de dar acceso a otras personas. El alta inicial de PIN está deshabilitada en el modo web para impedir que el primer visitante reclame las cuentas. La base local existente puede copiarse, fuera de GitHub, al volumen privado del servidor.

```bash
npm ci
npm run build
OPTISTOCK_PUBLIC_ORIGIN=https://inventario.ejemplo.com OPTISTOCK_DB_PATH=/datos/optistock.sqlite PORT=5173 npm run start:web
```

`OPTISTOCK_PUBLIC_ORIGIN` debe coincidir con la URL HTTPS usada por el navegador. El proxy debe conservar el encabezado `Host` público y ser el único punto de entrada al puerto Node. Las cookies llevan `HttpOnly`, `SameSite=Strict` y `Secure`; los cambios de datos exigen el mismo origen. Mantenga la base y su carpeta `backups/` en almacenamiento persistente. Ejecute un solo proceso que escriba en el archivo SQLite.

El repositorio **no contiene** el inventario real, sus Excel, los archivos cargados, respaldos ni PIN. [GitHub Pages](https://july-cm.github.io/OptiStock-IA/) muestra únicamente una demostración estática con datos ficticios; no permite iniciar sesión ni guardar cambios. Para operar el inventario de forma remota falta configurar el servidor HTTPS con almacenamiento persistente y trasladar la base privada por un canal seguro.

## Comprobación

```bash
node tests/pilot-current-state.mjs
node tests/pilot-smoke.mjs
node tests/pilot-closure.mjs
node tests/pilot-weekly-roundtrip.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Las pruebas usan bases temporales o en memoria. No alteran el inventario de uso.

