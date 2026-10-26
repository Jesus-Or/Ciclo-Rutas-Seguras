// ── Configuración de la descarga de la app móvil ──────────────
// Ruta del APK dentro de la web (se copia con `npm run android:copiar-apk`).
export const RUTA_APK_ANDROID = `${import.meta.env.BASE_URL}descargas/CicloRutas.apk`;

// iOS no permite descargar un .ipa desde una web. Mientras tanto se muestran las
// instrucciones para añadir la web a la pantalla de inicio. Cuando tengas el enlace de
// TestFlight o de la App Store, pégalo aquí y reemplazará esas instrucciones.
export const ENLACE_IOS = '';
