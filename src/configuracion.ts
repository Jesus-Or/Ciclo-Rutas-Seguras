// ── Configuración de la descarga de la app móvil ──────────────
// El APK lo compila GitHub Actions y lo publica solo en "Releases" (ver .github/workflows/compilar-moviles.yml).
// Este enlace no cambia: siempre apunta a la última versión compilada.
export const URL_APK_ANDROID = 'https://github.com/Jesus-Or/Ciclo-Rutas-Seguras/releases/download/android-latest/CicloRutas.apk';

// iOS no permite instalar un .ipa desde una web. Mientras tanto se muestran las
// instrucciones para añadir la web a la pantalla de inicio. Cuando tengas el enlace de
// TestFlight o de la App Store, pégalo aquí y reemplazará esas instrucciones.
export const ENLACE_IOS = '';