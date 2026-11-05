import type { CapacitorConfig } from '@capacitor/cli';

const configuracion: CapacitorConfig = {
  appId: 'com.ciclorutas.seguras',   // identificador único de la app (cámbialo antes de publicar en tiendas)
  appName: 'Ciclo Rutas Seguras',
  webDir: 'dist',                    // carpeta que genera `npm run build` (queda como respaldo)
  server: {
    // El APK carga la web publicada: cada cambio en GitHub Pages se ve sin reinstalar
    url: 'https://jesus-or.github.io/Ciclo-Rutas-Seguras/',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    // Dominios a los que la app puede navegar dentro del WebView
    allowNavigation: [
      'jesus-or.github.io',
      '*.supabase.co',
      '*.openstreetmap.org',
      '*.openstreetmap.de',
    ],
  },
  backgroundColor: '#0e1118',
};

export default configuracion;