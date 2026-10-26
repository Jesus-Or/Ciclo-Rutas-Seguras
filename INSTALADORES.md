# Generar los instaladores (Android e iOS)

La app web (React + Vite) se empaqueta con **Capacitor**. Los proyectos nativos ya están
generados en `android/` e `ios/`; el código de la app está en `src/` (variables en español).

Identificador de la app: `com.ciclorutas.seguras` (cámbialo en `capacitor.config.ts`
antes de publicar en tiendas; luego ejecuta `npx cap sync`).

## 0. Preparación (una sola vez)
```bash
npm install
```

## Android → APK
Requisitos: Node 22+, JDK 21 y Android Studio (trae el Android SDK).

**Opción A – línea de comandos**
```bash
npm run android:apk
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```
Copia el APK al celular y ábrelo (permite "instalar apps de orígenes desconocidos").

**Opción B – Android Studio**
```bash
npm run movil:sincronizar
npm run android:abrir
```
Menú *Build > Build Bundle(s) / APK(s) > Build APK(s)*.
Para publicar en Google Play: *Build > Generate Signed Bundle / APK* (genera un `.aab` firmado).

## iOS → IPA (requiere una Mac con Xcode 16+)
```bash
npm run movil:sincronizar
npm run ios:abrir
```
En Xcode: selecciona el target **App > Signing & Capabilities**, elige tu *Team* (cuenta Apple
Developer) y luego *Product > Archive > Distribute App* (Ad Hoc / TestFlight / App Store) para obtener el `.ipa`.
Para probar sin cuenta de pago, conecta tu iPhone y pulsa ▶ (instalación de desarrollo, dura 7 días).

> Apple no permite generar un `.ipa` instalable sin macOS ni certificado de firma.

## Compilar en la nube con GitHub (sin instalar nada)
Sube la carpeta a un repositorio de GitHub y ejecuta el flujo
`.github/workflows/compilar-moviles.yml` (Actions > Run workflow). Descarga el APK desde *Artifacts*.
El job de iOS genera una app para simulador; para un `.ipa` real hace falta firma (paso anterior).

## Cambiar ícono o splash
Edita los PNG de `assets/` y ejecuta `npm run movil:iconos` y `npx cap sync`.

## Notas
- Los mapas usan los servidores públicos de OpenStreetMap y Nominatim. Para una app publicada
  con suscripciones conviene un proveedor de tiles propio (su política de uso limita apps comerciales).
- Tras cambiar código en `src/`: `npm run movil:sincronizar` y vuelve a compilar.

## Botón "Descargar app" en la web
La web muestra el botón **📲 Descargar app** (se oculta dentro de la app instalada).
1. Compila el APK: `npm run android:apk`
2. Cópialo a la web: `npm run android:copiar-apk` (queda en `public/descargas/CicloRutas.apk`)
3. Publica la web con `npm run build` (el APK viaja dentro de `dist/`).
4. iOS: pon el enlace de TestFlight/App Store en `ENLACE_IOS` de `src/configuracion.ts`.

## iPhone para pruebas (sin cuenta Apple ni Mac)
La web es instalable: en Safari, *Compartir > Añadir a pantalla de inicio*.
- Misma red WiFi que tu PC: `npm run dev -- --host` y abre en el iPhone la dirección `http://IP-DE-TU-PC:5173`.
- Desde cualquier lugar: publica `dist/` (tras `npm run build`) en un hosting con HTTPS (GitHub Pages, Netlify, Vercel).

## Ubicación automática
Al abrir, la app toma el GPS del dispositivo como punto de partida (pide permiso la primera vez).
El inicio es siempre la ubicación del usuario (no se escribe); solo se ingresa el destino. Si niega el permiso, queda el botón "🎯 Reintentar ubicación".
Permisos ya configurados en `AndroidManifest.xml` e `Info.plist` (iOS). Código en `src/ubicacion.ts`.

## Tiempo de recorrido
- Estimado: distancia en línea recta × 1,3 (rodeo por calles) ÷ velocidad elegida (10, 15 o 20 km/h). Ver `src/utils.ts`.
- Al recorrer una ruta hay cronómetro en vivo y, al terminar, se muestra el tiempo real de la persona.
