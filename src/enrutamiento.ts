import type { Coordenada, PasoRuta, RutaCalculada } from './types';

// Servidor público de FOSSGIS con perfil bicicleta (solo para desarrollo/pruebas)
const URL_BASE = 'https://routing.openstreetmap.de/routed-bike/route/v1/driving';
const RADIO_TIERRA = 6371000;
const rad = (g: number) => (g * Math.PI) / 180;

// ── Geometría ───────────────────────────────────────────────────────────
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA * Math.asin(Math.sqrt(h));
}

/** Distancia mínima (m) de un punto a una polilínea. */
export function distanciaAPolilinea(p: Coordenada, linea: Coordenada[]): number {
  if (!linea.length) return Infinity;
  if (linea.length === 1) return distanciaMetros(p, linea[0]);
  const kLat = 111320;
  const kLon = 111320 * Math.cos(rad(p.latitud));
  let min = Infinity;
  for (let i = 0; i < linea.length - 1; i++) {
    const ax = (linea[i].longitud - p.longitud) * kLon;
    const ay = (linea[i].latitud - p.latitud) * kLat;
    const bx = (linea[i + 1].longitud - p.longitud) * kLon;
    const by = (linea[i + 1].latitud - p.latitud) * kLat;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < min) min = d;
  }
  return min;
}

/** Reduce una lista de coordenadas a máximo `max` puntos (incluye el primero y el último). */
export function muestrear(coords: Coordenada[], max = 25): Coordenada[] {
  if (coords.length <= max) return coords;
  const salida: Coordenada[] = [];
  for (let i = 0; i < max; i++) {
    salida.push(coords[Math.round((i * (coords.length - 1)) / (max - 1))]);
  }
  return salida;
}

// ── Formato de tiempo / distancia ─────────────────────────────────────
export function formatearDuracionVoz(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const partes: string[] = [];
  if (h) partes.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
  if (m) partes.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  if (!h && (s || !m)) partes.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`);
  return partes.join(' y ');
}

export function formatearReloj(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
}

export function formatearMetros(metros: number): string {
  return metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${Math.round(metros)} m`;
}

// ── Traducción de maniobras OSRM → español ────────────────────────────
const MODIFICADORES: Record<string, string> = {
  left: 'a la izquierda',
  right: 'a la derecha',
  'slight left': 'ligeramente a la izquierda',
  'slight right': 'ligeramente a la derecha',
  'sharp left': 'cerrado a la izquierda',
  'sharp right': 'cerrado a la derecha',
  straight: 'recto',
  uturn: 'en U',
};

function traducirPaso(tipo: string, modificador: string | undefined, via: string, salida?: number): string {
  const mod = modificador ? MODIFICADORES[modificador] ?? '' : '';
  const en = via ? ` por ${via}` : '';
  const hacia = via ? ` hacia ${via}` : '';

  if (modificador === 'uturn') return 'Da la vuelta en U';

  switch (tipo) {
    case 'depart':
      return `Inicia tu recorrido${en}`;
    case 'arrive':
      return 'Has llegado a tu destino';
    case 'turn':
      return modificador === 'straight'
        ? `Continúa recto${en}`
        : `Gira ${mod}${hacia}`.trim();
    case 'end of road':
      return `Al final de la vía, gira ${mod}${hacia}`.trim();
    case 'fork':
      return `Toma la bifurcación ${mod}${hacia}`.trim();
    case 'merge':
      return `Incorpórate ${mod}${en}`.trim();
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return salida
        ? `En la glorieta, toma la salida número ${salida}${hacia}`
        : `Entra en la glorieta${hacia}`;
    default:
      return `Continúa ${mod || 'recto'}${en}`.trim();
  }
}

// ── Servicio principal ───────────────────────────────────────────────
/**
 * Calcula una ruta ciclista real por las calles pasando por todos los puntos dados
 * (mínimo 2). Devuelve geometría, distancia, duración y pasos en español.
 */
export async function calcularRutaReal(puntos: Coordenada[], signal?: AbortSignal): Promise<RutaCalculada> {
  if (puntos.length < 2) throw new Error('Se necesitan al menos 2 puntos');

  const coords = puntos.map(p => `${p.longitud},${p.latitud}`).join(';');
  const url = `${URL_BASE}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=false`;

  const respuesta = await fetch(url, { signal });
  if (!respuesta.ok) throw new Error(`Error del servicio de rutas (${respuesta.status})`);
  const datos = await respuesta.json();
  if (datos.code !== 'Ok' || !datos.routes?.length) {
    throw new Error('No se encontró una ruta entre esos puntos');
  }

  const ruta = datos.routes[0];
  const coordenadas: Coordenada[] = ruta.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => ({ latitud: lat, longitud: lon })
  );

  const pasosBrutos: any[] = ruta.legs.flatMap((leg: any) => leg.steps);
  const pasos: PasoRuta[] = pasosBrutos
    .filter((s, i) => {
      // Con puntos intermedios se omiten los depart/arrive internos de cada tramo
      if (s.maneuver.type === 'depart') return i === 0;
      if (s.maneuver.type === 'arrive') return i === pasosBrutos.length - 1;
      return true;
    })
    .map((s) => ({
      tipo: s.maneuver.type,
      instruccion: traducirPaso(s.maneuver.type, s.maneuver.modifier, s.name || '', s.maneuver.exit),
      distancia: s.distance,
      duracion: s.duration,
      posicion: { latitud: s.maneuver.location[1], longitud: s.maneuver.location[0] },
      nombreVia: s.name || '',
    }));

  return {
    coordenadas,
    distanciaMetros: ruta.distance,
    duracionSegundos: ruta.duration,
    pasos,
  };
}

/** Nombre del barrio/sector de un punto (Nominatim). Devuelve null si no se pudo. */
export async function obtenerSector(p: Coordenada): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=es&lat=${p.latitud}&lon=${p.longitud}`
    );
    if (!r.ok) return null;
    const d = await r.json();
    const a = d.address ?? {};
    return a.neighbourhood || a.suburb || a.quarter || a.city_district || a.road || null;
  } catch {
    return null;
  }
}