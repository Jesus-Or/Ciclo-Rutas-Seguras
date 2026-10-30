// ── Ubicación del usuario ─────────────────────────────────────
// En la app instalada usa el GPS del dispositivo (pide permiso la primera vez);
// en la web usa la geolocalización del navegador.
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Coordenada } from './types';

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

// Seguimiento continuo: avisa cada vez que el usuario se mueve (por ejemplo, manejando).
// Devuelve una función para detener el seguimiento.
export async function observarUbicacion(
  alCambiar: (coordenada: Coordenada, precisionMetros: number) => void,
  alFallar?: (error: unknown) => void,
): Promise<() => void> {
  await pedirPermisoSiHaceFalta();
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