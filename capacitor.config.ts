import type { CapacitorConfig } from '@capacitor/cli';

const configuracion: CapacitorConfig = {
  appId: 'com.ciclorutas.seguras',   // identificador único de la app (cámbialo antes de publicar en tiendas)
  appName: 'Ciclo Rutas Seguras',
  webDir: 'dist',                    // carpeta que genera `npm run build`
  server: {
    androidScheme: 'https',
    iosScheme: 'https',              // evita el origen capacitor:// que algunos servicios de mapas rechazan
  },
  backgroundColor: '#0e1118',
};

export default configuracion;
