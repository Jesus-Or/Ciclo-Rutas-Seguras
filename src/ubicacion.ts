// ── Ubicación del usuario ─────────────────────────────────────
// App instalada: GPS nativo; con un recorrido en curso usa un servicio en segundo plano
// (notificación fija) para seguir la ruta con la pantalla apagada.
// Web: geolocalización del navegador.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { Coordenada } from './types';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

async function pedirPermisoSiHaceFalta(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const permisos = await Geolocation.requestPermissions();
  if (permisos.location !== 'granted' && permisos.coarseLocation !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }
}

// Lectura única (botón "Actualizar mi ubicación")
export async function obtenerUbicacionActual(): Promise<Coordenada> {
  await pedirPermisoSiHaceFalta();
  const posicion = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  return { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
}

// Seguimiento continuo. Con segundoPlano=true (recorrido en curso) sigue funcionando con la pantalla apagada.
// Devuelve una función para detener el seguimiento.
export async function observarUbicacion(
  alCambiar: (coordenada: Coordenada, precisionMetros: number) => void,
  alFallar?: (error: unknown) => void,
  segundoPlano = false,
): Promise<() => void> {
  await pedirPermisoSiHaceFalta();

  if (segundoPlano && Capacitor.isNativePlatform()) {
    const id = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: 'Ciclo Rutas Seguras',
        backgroundMessage: 'Siguiendo tu recorrido…',
        requestPermissions: true,
        stale: false,
        distanceFilter: 5,
      },
      (posicion, error) => {
        if (error || !posicion) { alFallar?.(error); return; }
        alCambiar({ latitud: posicion.latitude, longitud: posicion.longitude }, posicion.accuracy);
      },
    );
    return () => { void BackgroundGeolocation.removeWatcher({ id }); };
  }

  const id = await Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
    (posicion, error) => {
      if (error || !posicion) { alFallar?.(error); return; }
      alCambiar(
        { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude },
        posicion.coords.accuracy,
      );
    },
  );
  return () => { Geolocation.clearWatch({ id }); };
}
