if (!process.env.OPTISTOCK_PUBLIC_ORIGIN) throw Error('Configura OPTISTOCK_PUBLIC_ORIGIN con la URL HTTPS de la aplicación.');
const origin = new URL(process.env.OPTISTOCK_PUBLIC_ORIGIN);
if (origin.protocol !== 'https:') throw Error('La aplicación web requiere HTTPS.');
process.env.OPTISTOCK_WEB_MODE = '1';
await import('./preview-portable.mjs');
