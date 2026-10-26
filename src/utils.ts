import { RutaCiclista, NivelSeguridad, Coordenada, MarcadorMapa } from './types';

export function colorSeguridad(level: NivelSeguridad): string {
  switch (level) {
    case 'segura':      return '#00c896';
    case 'moderada':  return '#ffb142';
    case 'peligrosa': return '#ff4757';
  }
}

export function etiquetaSeguridad(level: NivelSeguridad): string {
  switch (level) {
    case 'segura':      return 'Segura';
    case 'moderada':  return 'Moderada';
    case 'peligrosa': return 'Peligrosa';
  }
}

export function promedioCalificacion(ruta: RutaCiclista): number {
  if (!ruta.calificaciones.length) return 0;
  return ruta.calificaciones.reduce((a, b) => a + b, 0) / ruta.calificaciones.length;
}

export function formatearCalificacion(ruta: RutaCiclista): string {
  const promedio = promedioCalificacion(ruta);
  return promedio ? promedio.toFixed(1) : '—';
}

export function estrellasDesdeCalificacion(calificacion: number): string {
  return '★'.repeat(Math.round(calificacion)) + '☆'.repeat(5 - Math.round(calificacion));
}

export const ETIQUETAS_CALIFICACION: Record<number, string> = {
  1: '😞 Muy mala',
  2: '😕 Mala',
  3: '😐 Regular',
  4: '😊 Buena',
  5: '🤩 Excelente',
};

export const IMPRESIONES_RUTA = [
  { valor: 'Muy segura',       emoji: '😌' },
  { valor: 'Bien señalizada',  emoji: '🪧' },
  { valor: 'Pavimento liso',   emoji: '🛣️' },
  { valor: 'Mucho tráfico',    emoji: '🚗' },
  { valor: 'Mal pavimento',    emoji: '🕳️' },
  { valor: 'Paisaje bonito',   emoji: '🌳' },
  { valor: 'Insegura',         emoji: '⚠️' },
  { valor: 'Recomendaría',     emoji: '👍' },
];

export const TIPOS_INCIDENTE = [
  { valor: 'Accidente',           emoji: '🚨' },
  { valor: 'Hueco / Obstáculo',   emoji: '🕳️' },
  { valor: 'Robo / Inseguridad',  emoji: '🔓' },
  { valor: 'Tráfico peligroso',   emoji: '🚗' },
  { valor: 'Carril bloqueado',    emoji: '🚧' },
  { valor: 'Mala iluminación',    emoji: '💡' },
  { valor: 'Lluvia / Vía mojada', emoji: '🌧️' },
  { valor: 'Otro',                emoji: '📌' },
];

// ── Estimación de seguridad del trazado entre dos puntos ────────
// Es una heurística de simulación (no un motor de ruteo real):
// compara el trazado en línea recta contra las rutas conocidas y
// los puntos de peligro/incidentes reportados por la comunidad.

export interface EstimacionSeguridadRuta {
  level: NivelSeguridad;
  reason: string;
}

const RADIO_TIERRA_KM = 6371;
const UMBRAL_COINCIDENCIA_RUTA_KM = 0.35; // ~350m: se considera "sobre" una ruta conocida
const UMBRAL_PELIGRO_KM = 0.30;      // ~300m: cercanía suficiente a un punto peligroso

function aRadianes(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanciaHaversineKm(a: Coordenada, b: Coordenada): number {
  const deltaLatitud = aRadianes(b.latitud - a.latitud);
  const deltaLongitud = aRadianes(b.longitud - a.longitud);
  const latitud1 = aRadianes(a.latitud);
  const latitud2 = aRadianes(b.latitud);
  const h =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(latitud1) * Math.cos(latitud2) * Math.sin(deltaLongitud / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

function muestrearLinea(a: Coordenada, b: Coordenada, pasos = 14): Coordenada[] {
  const puntos: Coordenada[] = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    puntos.push({ latitud: a.latitud + (b.latitud - a.latitud) * t, longitud: a.longitud + (b.longitud - a.longitud) * t });
  }
  return puntos;
}

export function estimarSeguridadRuta(
  inicio: Coordenada,
  fin: Coordenada,
  rutas: RutaCiclista[],
  marcadores: MarcadorMapa[]
): EstimacionSeguridadRuta {
  const muestras = muestrearLinea(inicio, fin);

  // 1. ¿El trazado pasa cerca de alguna ruta conocida?
  let rutaMasCercana: RutaCiclista | null = null;
  let distanciaRutaMasCercana = Infinity;
  for (const ruta of rutas) {
    for (const coordenadaRuta of ruta.coordenadas) {
      for (const s of muestras) {
        const d = distanciaHaversineKm(coordenadaRuta, s);
        if (d < distanciaRutaMasCercana) {
          distanciaRutaMasCercana = d;
          rutaMasCercana = ruta;
        }
      }
    }
  }

  // 2. ¿El trazado pasa cerca de un punto peligroso o incidente reportado?
  const marcadoresRiesgo = marcadores.filter(m => m.tipo === 'peligro' || m.tipo === 'incidente');
  let riesgoMasCercano: MarcadorMapa | null = null;
  let distanciaRiesgoMasCercano = Infinity;
  for (const m of marcadoresRiesgo) {
    for (const s of muestras) {
      const d = distanciaHaversineKm(m.posicion, s);
      if (d < distanciaRiesgoMasCercano) {
        distanciaRiesgoMasCercano = d;
        riesgoMasCercano = m;
      }
    }
  }

  // Un peligro cercano siempre gana, sin importar si hay ruta segura conocida cerca.
  if (riesgoMasCercano && distanciaRiesgoMasCercano <= UMBRAL_PELIGRO_KM) {
    return {
      level: 'peligrosa',
      reason: `El trazado pasa cerca de "${riesgoMasCercano.titulo}", un punto reportado por la comunidad.`,
    };
  }

  if (rutaMasCercana && distanciaRutaMasCercana <= UMBRAL_COINCIDENCIA_RUTA_KM) {
    return {
      level: rutaMasCercana.nivelSeguridad,
      reason: `Coincide con la ruta conocida "${rutaMasCercana.nombre}" (${etiquetaSeguridad(rutaMasCercana.nivelSeguridad)}).`,
    };
  }

  return {
    level: 'moderada',
    reason: 'No hay suficientes datos de la comunidad sobre este tramo. Circula con precaución.',
  };
}

// ── Tiempo de recorrido de la persona ─────────────────────────
// Estimación: distancia en línea recta × factor de rodeo (las calles no son rectas)
// dividida entre la velocidad promedio de la persona. No es un motor de ruteo real.
export const FACTOR_RODEO = 1.3;

export const PERFILES_VELOCIDAD = [
  { etiqueta: '🐢 Tranquilo', kmh: 10 },
  { etiqueta: '🚴 Normal',    kmh: 15 },
  { etiqueta: '⚡ Rápido',    kmh: 20 },
];

export interface EstimacionTiempo {
  distanciaKm: number;
  minutos: number;
}

export function minutosPorDistancia(distanciaKm: number, velocidadKmh: number): number {
  return (distanciaKm / velocidadKmh) * 60;
}

export function estimarTiempoRecorrido(inicio: Coordenada, fin: Coordenada, velocidadKmh: number): EstimacionTiempo {
  const distanciaKm = distanciaHaversineKm(inicio, fin) * FACTOR_RODEO;
  return { distanciaKm, minutos: minutosPorDistancia(distanciaKm, velocidadKmh) };
}

export function formatearDistancia(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatearDuracion(minutos: number): string {
  const total = Math.max(1, Math.round(minutos));
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${horas} h ${String(resto).padStart(2, '0')} min` : `${horas} h`;
}

export function formatearCronometro(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
