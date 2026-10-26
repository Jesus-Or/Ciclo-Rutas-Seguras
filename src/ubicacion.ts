// ── Ubicación actual del usuario ──────────────────────────────
// En la app instalada usa el GPS del dispositivo (pide permiso la primera vez);
// en la web usa la geolocalización del navegador.
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Coordenada } from './types';

export async function obtenerUbicacionActual(): Promise<Coordenada> {
  if (Capacitor.isNativePlatform()) {
    const permisos = await Geolocation.requestPermissions();
    if (permisos.location !== 'granted' && permisos.coarseLocation !== 'granted') {
      throw new Error('Permiso de ubicación denegado');
    }
  }
  const posicion = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  return { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
}
