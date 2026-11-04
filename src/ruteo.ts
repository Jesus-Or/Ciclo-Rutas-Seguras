import type { Coordenada, RutaCiclista } from './types';
import { distanciaHaversineKm } from './utils';
import { URL_RUTEO_BICI, URL_SECTOR } from './configuracion';

// ── Rutas por las calles reales (OpenStreetMap, perfil bicicleta) ─────────────

export interface PasoRuta {
  instruccion: string;      // "Gira a la derecha por Calle 72"
  calle: string;            // calle por la que sigues DESPUÉS de la maniobra
  maniobra: string;         // tipo OSRM: turn, new name, arrive...
  giro: string;             // modificador OSRM: left, right, straight...
  ubicacion: Coordenada;    // dónde ocurre la maniobra
  distanciaM: number;       // largo del paso
  distanciaAcumM: number;   // metros desde el inicio hasta la maniobra
}

export interface RutaCalculada {
  id: string;
  puntos: Coordenada[];
  acumuladoM: number[];     // metros acumulados hasta cada punto
  distanciaKm: number;
  duracionMin: number;      // según el servicio (se recalcula con la velocidad del usuario)
  pasos: PasoRuta[];
  porCalles: boolean;       // false = línea recta de respaldo (sin conexión al servicio)
}

let contadorRutas = 0;

export function acumulado(puntos: Coordenada[]): number[] {
  const acum = [0];
  for (let i = 1; i < puntos.length; i++) {
    acum.push(acum[i - 1] + distanciaHaversineKm(puntos[i - 1], puntos[i]) * 1000);
  }
  return acum;
}

// ── Instrucciones en español ──────────────────────────────────────────
const GIROS: Record<string, string> = {
  left: 'a la izquierda',
  right: 'a la derecha',
  'slight left': 'ligeramente a la izquierda',
  'slight right': 'ligeramente a la derecha',
  'sharp left': 'cerrado a la izquierda',
  'sharp right': 'cerrado a la derecha',
};

export function instruccionEnEspanol(tipo: string, giro: string, calle: string, salida?: number): string {
  const por = calle ? ` por ${calle}` : '';
  switch (tipo) {
    case 'depart':
      return calle ? `Inicia tu recorrido por ${calle}` : 'Inicia tu recorrido';
    case 'arrive':
      return 'Has llegado a tu destino';
    case 'merge':
      return calle ? `Incorpórate a ${calle}` : 'Incorpórate a la vía';
    case 'new name':
    case 'continue':
      return giro === 'straight' || !GIROS[giro] ? `Continúa${por}` : `Continúa ${GIROS[giro]}${por}`;
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return salida ? `En la glorieta, toma la salida ${salida}${por}` : `Entra a la glorieta${por}`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Sal de la glorieta${por}`;
    case 'fork':
      return GIROS[giro] ? `Toma el desvío ${GIROS[giro]}${por}` : `Continúa${por}`;
    case 'end of road':
      return GIROS[giro] ? `Al final de la vía, gira ${GIROS[giro]}${por}` : `Continúa${por}`;
    default: // turn, on ramp, off ramp...
      if (giro === 'uturn') return `Da la vuelta${por}`;
      if (giro === 'straight' || !GIROS[giro]) return `Sigue recto${por}`;
      return `Gira ${GIROS[giro]}${por}`;
  }
}

// ── Llamada al servicio ───────────────────────────────────────────────
interface PasoOsrm {
  name?: string;
  distance: number;
  maneuver: { type: string; modifier?: string; location: [number, number]; exit?: number };
}
interface RespuestaOsrm {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: { steps: PasoOsrm[] }[];
  }[];
}

const cache = new Map<string, RutaCalculada>();

function convertir(datos: RespuestaOsrm): RutaCalculada {
  const ruta = datos.routes?.[0];
  if (datos.code !== 'Ok' || !ruta) throw new Error('Sin ruta disponible');

  const puntos: Coordenada[] = ruta.geometry.coordinates.map(([longitud, latitud]) => ({ latitud, longitud }));
  const pasos: PasoRuta[] = [];
  let acum = 0;
  ruta.legs.forEach((tramo, indiceTramo) => {
    const ultimoTramo = indiceTramo === ruta.legs.length - 1;
    tramo.steps.forEach(p => {
      const tipo = p.maneuver.type;
      const largo = p.distance ?? 0;
      // En puntos intermedios (waypoints) el servicio inventa "llegada" y "salida": se ignoran
      const esLlegadaIntermedia = tipo === 'arrive' && !ultimoTramo;
      const esSalidaIntermedia = tipo === 'depart' && indiceTramo > 0;
      if (!esLlegadaIntermedia && !esSalidaIntermedia) {
        const calle = (p.name ?? '').trim();
        const giro = p.maneuver.modifier ?? '';
        pasos.push({
          instruccion: instruccionEnEspanol(tipo, giro, calle, p.maneuver.exit),
          calle,
          maniobra: tipo,
          giro,
          ubicacion: { latitud: p.maneuver.location[1], longitud: p.maneuver.location[0] },
          distanciaM: largo,
          distanciaAcumM: acum,
        });
      }
      acum += largo;
    });
  });

  const acumuladoM = acumulado(puntos);
  // La llegada queda exactamente al final del trazado
  const ultimo = pasos[pasos.length - 1];
  if (ultimo && ultimo.maniobra === 'arrive') ultimo.distanciaAcumM = acumuladoM[acumuladoM.length - 1];

  return {
    id: `ruta-${++contadorRutas}`,
    puntos,
    acumuladoM,
    distanciaKm: ruta.distance / 1000,
    duracionMin: ruta.duration / 60,
    pasos,
    porCalles: true,
  };
}

// Calcula el recorrido por calles pasando por los puntos indicados (origen, ...intermedios, destino)
export async function calcularRutaPorCalles(puntos: Coordenada[], tiempoMaxMs = 15000): Promise<RutaCalculada> {
  if (puntos.length < 2) throw new Error('Faltan puntos');
  const coordenadas = puntos.map(p => `${p.longitud.toFixed(6)},${p.latitud.toFixed(6)}`).join(';');
  const guardada = cache.get(coordenadas);
  if (guardada) return { ...guardada, id: `ruta-${++contadorRutas}` };

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), tiempoMaxMs);
  try {
    const url = `${URL_RUTEO_BICI}/${coordenadas}?overview=full&geometries=geojson&steps=true&continue_straight=false`;
    const respuesta = await fetch(url, { signal: control.signal });
    if (!respuesta.ok) throw new Error(`Servicio de rutas: ${respuesta.status}`);
    const ruta = convertir((await respuesta.json()) as RespuestaOsrm);
    if (cache.size > 30) cache.delete(cache.keys().next().value as string);
    cache.set(coordenadas, ruta);
    return ruta;
  } finally {
    clearTimeout(temporizador);
  }
}

// Respaldo sin conexión: sigue los puntos conocidos (o línea recta) con una sola instrucción
export function rutaRecta(origen: Coordenada, destino: Coordenada, via: Coordenada[] = []): RutaCalculada {
  const puntos = [origen, ...via, destino];
  const acumuladoM = acumulado(puntos);
  const total = acumuladoM[acumuladoM.length - 1];
  const factor = via.length ? 1 : 1.3;   // sin puntos intermedios las calles dan más vuelta que la línea recta
  const km = (total / 1000) * factor;
  return {
    id: `ruta-${++contadorRutas}`,
    puntos,
    acumuladoM,
    distanciaKm: km,
    duracionMin: (km / 15) * 60,
    porCalles: false,
    pasos: [
      { instruccion: 'Dirígete hacia tu destino', calle: '', maniobra: 'depart', giro: 'straight', ubicacion: origen, distanciaM: total, distanciaAcumM: 0 },
      { instruccion: 'Has llegado a tu destino', calle: '', maniobra: 'arrive', giro: '', ubicacion: destino, distanciaM: 0, distanciaAcumM: total },
    ],
  };
}

// Puntos intermedios para forzar que el recorrido siga una ruta conocida (máximo `maximo` puntos)
export function puntosIntermedios(coordenadas: Coordenada[], maximo = 10): Coordenada[] {
  if (coordenadas.length <= 2) return [];
  const interiores = coordenadas.slice(1, -1);
  if (interiores.length <= maximo) return interiores;
  const salida: Coordenada[] = [];
  for (let i = 0; i < maximo; i++) salida.push(interiores[Math.round((i * (interiores.length - 1)) / (maximo - 1))]);
  return salida;
}

// Puntos de una ruta conocida que aún faltan por recorrer desde `posicion` (para recalcular sin perder la ruta elegida)
export function viaRestante(coordenadas: Coordenada[], posicion: Coordenada, maximo = 8): Coordenada[] {
  if (coordenadas.length < 3) return [];
  let mejor = 0, distanciaMejor = Infinity;
  coordenadas.forEach((c, i) => {
    const d = distanciaHaversineKm(c, posicion);
    if (d < distanciaMejor) { distanciaMejor = d; mejor = i; }
  });
  const restantes = [posicion, ...coordenadas.slice(mejor + 1)];
  return puntosIntermedios(restantes, maximo);
}

// ── Rutas conocidas ajustadas a las calles reales ───────────────────────
function largoPolilineaKm(puntos: Coordenada[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) total += distanciaHaversineKm(puntos[i - 1], puntos[i]);
  return total;
}

export async function ajustarRutaACalles(ruta: RutaCiclista): Promise<{ coordenadas: Coordenada[]; distanciaKm: number } | null> {
  const original = ruta.coordenadas;
  if (original.length < 2) return null;
  const calculada = await calcularRutaPorCalles([original[0], ...puntosIntermedios(original, 10), original[original.length - 1]]);
  // Seguridad: si el servicio da una vuelta enorme, se conserva el trazado original
  const razon = calculada.distanciaKm / Math.max(0.1, largoPolilineaKm(original));
  if (razon < 0.7 || razon > 1.6) return null;
  return { coordenadas: calculada.puntos, distanciaKm: Math.round(calculada.distanciaKm * 10) / 10 };
}

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Ajusta las rutas conocidas a las calles reales, una por una (máx. 1 petición por segundo) y guarda el resultado
// en el dispositivo para no volver a pedirlo. Devuelve una función para cancelar.
export function ajustarRutasConocidas(
  rutas: RutaCiclista[],
  alAjustar: (id: string, coordenadas: Coordenada[], distanciaKm: number) => void,
): () => void {
  let cancelado = false;
  const clave = (r: RutaCiclista) =>
    `ciclorutas_trazado_v1_${r.id}_${r.coordenadas.length}_${r.coordenadas[0].latitud}_${r.coordenadas[r.coordenadas.length - 1].longitud}`;

  (async () => {
    for (const ruta of rutas) {
      if (cancelado) return;
      try {
        const guardado = localStorage.getItem(clave(ruta));
        if (guardado) {
          const { coordenadas, distanciaKm } = JSON.parse(guardado) as { coordenadas: Coordenada[]; distanciaKm: number };
          alAjustar(ruta.id, coordenadas, distanciaKm);
          continue;
        }
      } catch { /* sin almacenamiento */ }

      try {
        const ajustada = await ajustarRutaACalles(ruta);
        if (cancelado) return;
        if (ajustada) {
          alAjustar(ruta.id, ajustada.coordenadas, ajustada.distanciaKm);
          try { localStorage.setItem(clave(ruta), JSON.stringify(ajustada)); } catch { /* sin almacenamiento */ }
        }
      } catch {
        return; // sin conexión o servicio caído: se conservan los trazados originales
      }
      await esperar(1100);
    }
  })();

  return () => { cancelado = true; };
}

// ── Sector / barrio donde va el usuario ───────────────────────────────
export async function sectorEn(posicion: Coordenada): Promise<string> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), 8000);
  try {
    const url = `${URL_SECTOR}?format=jsonv2&lat=${posicion.latitud}&lon=${posicion.longitud}&zoom=16&addressdetails=1&accept-language=es`;
    const respuesta = await fetch(url, { signal: control.signal });
    if (!respuesta.ok) return '';
    const datos = (await respuesta.json()) as { address?: Record<string, string> };
    const a = datos.address ?? {};
    return a.neighbourhood || a.suburb || a.quarter || a.city_district || a.borough || '';
  } catch {
    return '';
  } finally {
    clearTimeout(temporizador);
  }
}
