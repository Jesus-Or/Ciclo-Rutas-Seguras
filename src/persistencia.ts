// ── Persistencia del recorrido en curso ───────────────────────────────
// Guarda la ruta activa para retomarla si el sistema cierra la app (pantalla apagada, poca memoria, etc.).
// En el celular usa Preferences (almacenamiento nativo); en la web, localStorage.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { PuntoRuta, RutaCiclista } from './types';

const CLAVE = 'ciclorutas_recorrido_en_curso';
const MAX_EDAD_MS = 12 * 60 * 60 * 1000; // un recorrido guardado de hace más de 12 h se descarta

export interface RecorridoGuardado {
  ruta: RutaCiclista;
  destino: PuntoRuta | null;
  inicioMs: number;   // hora de inicio (el cronómetro se calcula con esto, no con timers)
  voz: boolean;
}

export async function guardarRecorrido(datos: RecorridoGuardado): Promise<void> {
  const texto = JSON.stringify(datos);
  try {
    if (Capacitor.isNativePlatform()) await Preferences.set({ key: CLAVE, value: texto });
    else localStorage.setItem(CLAVE, texto);
  } catch { /* sin almacenamiento */ }
}

export async function borrarRecorrido(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) await Preferences.remove({ key: CLAVE });
    else localStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento */ }
}

export async function leerRecorrido(): Promise<RecorridoGuardado | null> {
  try {
    const texto = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key: CLAVE })).value
      : localStorage.getItem(CLAVE);
    if (!texto) return null;
    const datos = JSON.parse(texto) as RecorridoGuardado;
    if (!datos?.ruta?.id || !Array.isArray(datos.ruta.coordenadas) || typeof datos.inicioMs !== 'number') return null;
    if (Date.now() - datos.inicioMs > MAX_EDAD_MS) { await borrarRecorrido(); return null; }
    return datos;
  } catch { return null; }
}
