// ── Configuración de la descarga de la app móvil ──────────────
// El APK lo compila GitHub Actions y lo publica solo en "Releases" (ver .github/workflows/compilar-moviles.yml).
// Este enlace no cambia: siempre apunta a la última versión compilada.
export const URL_APK_ANDROID = 'https://github.com/Jesus-Or/Ciclo-Rutas-Seguras/releases/download/android-latest/CicloRutas.apk';

// iOS no permite instalar un .ipa desde una web. Mientras tanto se muestran las
// instrucciones para añadir la web a la pantalla de inicio. Cuando tengas el enlace de
// TestFlight o de la App Store, pégalo aquí y reemplazará esas instrucciones.
export const ENLACE_IOS = '';

// ── Servicios de mapas (rutas por calles y sectores) ──────────────────
// Ruteo para bicicleta con datos de OpenStreetMap. Es un servidor público y gratuito (FOSSGIS):
// uso razonable y sin garantías. Para una app comercial con muchos usuarios conviene un servidor
// propio de OSRM/Valhalla o un servicio de pago (OpenRouteService, GraphHopper, Stadia Maps).
export const URL_RUTEO_BICI = 'https://routing.openstreetmap.de/routed-bike/route/v1/driving';

// Para decir en qué barrio / sector va el usuario (geocodificación inversa de OpenStreetMap)
export const URL_SECTOR = 'https://nominatim.openstreetmap.org/reverse';
