// Service worker mínimo: hace que Chrome en Android permita "Instalar app".
// No guarda nada en caché, así que nunca muestra versiones viejas de la web.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});