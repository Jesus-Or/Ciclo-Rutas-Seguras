import { RutaCiclista, NivelSeguridad, Coordenada, MarcadorMapa } from './types';

export function colorSeguridad(nivel: NivelSeguridad): string {
  switch (nivel) {
    case 'segura':      return '#00c896';
    case 'moderada':  return '#ffb142';
    case 'peligrosa': return '#ff4757';
  }
}

export function etiquetaSeguridad(nivel: NivelSeguridad): string {
  switch (nivel) {
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
// Es una heurística de simulación (no un motor de ruteo real). Funciona así:
//  1. Se toman puntos a lo largo del trazado (cada ~100 m).
//  2. Para cada punto se buscan las rutas conocidas cercanas (distancia al TRAMO,
//     no solo a los vértices) y se promedia su riesgo, dando más peso a las más cercanas.
//     El tramo más riesgoso del trayecto pesa más que el promedio (un tramo malo basta para no ser "segura").
//  3. Los puntos de peligro / incidentes cercanos suman riesgo.
//  4. El riesgo final se convierte en: segura, moderada o peligrosa.

export interface EstimacionSeguridadRuta {
  nivel: NivelSeguridad;
  motivo: string;
}

const RADIO_TIERRA_KM = 6371;
const RADIO_INFLUENCIA_KM = 0.6;      // una ruta conocida "opina" sobre el trazado si está a menos de 600 m
const UMBRAL_PELIGRO_KM = 0.3;        // un punto de peligro cuenta si está a menos de 300 m del trazado
const PASO_MUESTREO_KM = 0.1;         // un punto de muestra cada ~100 m
const PESO_TRAMO_MAS_RIESGOSO = 0.2;   // 20% del riesgo sale del tramo más riesgoso (percentil 85), 80% del promedio
const COBERTURA_MINIMA = 0.2;         // con menos de 20% del trazado cubierto no hay datos suficientes
const RIESGO_POR_PUNTO_PELIGRO = 0.7; // cada punto de peligro cercano suma esto (máximo 2 puntos)
const LIMITE_SEGURA = 0.6;           // riesgo por debajo de esto => segura
const LIMITE_MODERADA = 1.35;          // por debajo de esto => moderada; desde aquí => peligrosa

const RIESGO_POR_NIVEL: Record<NivelSeguridad, number> = { segura: 0, moderada: 1, peligrosa: 2 };

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

// Distancia (km) de un punto a un tramo a-b. Usa una proyección plana local,
// suficientemente precisa a escala de ciudad.
function distanciaPuntoTramoKm(p: Coordenada, a: Coordenada, b: Coordenada): number {
  const kmPorGradoLat = 110.57;
  const kmPorGradoLng = 111.32 * Math.cos(aRadianes(p.latitud));
  const ax = (a.longitud - p.longitud) * kmPorGradoLng, ay = (a.latitud - p.latitud) * kmPorGradoLat;
  const bx = (b.longitud - p.longitud) * kmPorGradoLng, by = (b.latitud - p.latitud) * kmPorGradoLat;
  const dx = bx - ax, dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / largo2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

// Distancia (km) de un punto a una ruta completa (la línea, no solo sus vértices)
function distanciaPuntoRutaKm(p: Coordenada, coordenadas: Coordenada[]): number {
  if (coordenadas.length === 1) return distanciaHaversineKm(p, coordenadas[0]);
  let mejor = Infinity;
  for (let i = 1; i < coordenadas.length; i++) {
    mejor = Math.min(mejor, distanciaPuntoTramoKm(p, coordenadas[i - 1], coordenadas[i]));
  }
  return mejor;
}

// Puntos a lo largo de la línea recta a-b, uno cada PASO_MUESTREO_KM (entre 8 y 80)
function muestrearLinea(a: Coordenada, b: Coordenada): Coordenada[] {
  const pasos = Math.max(8, Math.min(80, Math.ceil(distanciaHaversineKm(a, b) / PASO_MUESTREO_KM)));
  const puntos: Coordenada[] = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    puntos.push({
      latitud: a.latitud + (b.latitud - a.latitud) * t,
      longitud: a.longitud + (b.longitud - a.longitud) * t,
    });
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

  // 1. Riesgo de cada punto según las rutas conocidas cercanas (más cerca = más peso)
  const riesgos: number[] = [];   // riesgo de cada punto que tiene datos
  const pesoPorRuta = new Map<string, number>();

  for (const muestra of muestras) {
    let sumaPesos = 0;
    let sumaPonderada = 0;
    for (const ruta of rutas) {
      const d = distanciaPuntoRutaKm(muestra, ruta.coordenadas);
      if (d > RADIO_INFLUENCIA_KM) continue;
      const peso = 1 / (d + 0.05) ** 2;
      sumaPesos += peso;
      sumaPonderada += peso * RIESGO_POR_NIVEL[ruta.nivelSeguridad];
      pesoPorRuta.set(ruta.id, (pesoPorRuta.get(ruta.id) ?? 0) + peso);
    }
    if (sumaPesos > 0) {
      riesgos.push(sumaPonderada / sumaPesos);
    }
  }

  const cobertura = riesgos.length / muestras.length;
  let riesgoRutas = 1; // sin datos suficientes: se asume moderado
  if (cobertura >= COBERTURA_MINIMA) {
    const promedio = riesgos.reduce((suma, r) => suma + r, 0) / riesgos.length;
    const ordenados = [...riesgos].sort((r1, r2) => r1 - r2);
    const tramoMasRiesgoso = ordenados[Math.floor(0.85 * (ordenados.length - 1))];
    riesgoRutas = (1 - PESO_TRAMO_MAS_RIESGOSO) * promedio + PESO_TRAMO_MAS_RIESGOSO * tramoMasRiesgoso;
  }

  // 2. Puntos de peligro o incidentes cerca del trazado
  const peligrosCercanos = marcadores
    .filter(m => m.tipo === 'peligro' || m.tipo === 'incidente')
    .filter(m => muestras.some(s => distanciaHaversineKm(m.posicion, s) <= UMBRAL_PELIGRO_KM));

  const riesgo = riesgoRutas + RIESGO_POR_PUNTO_PELIGRO * Math.min(peligrosCercanos.length, 2);

  // 3. Nivel final
  const nivel: NivelSeguridad =
    riesgo < LIMITE_SEGURA ? 'segura' : riesgo < LIMITE_MODERADA ? 'moderada' : 'peligrosa';

  // 4. Explicación para el usuario
  const partes: string[] = [];
  if (cobertura >= COBERTURA_MINIMA) {
    const principales = rutas
      .filter(r => pesoPorRuta.has(r.id))
      .sort((r1, r2) => (pesoPorRuta.get(r2.id) ?? 0) - (pesoPorRuta.get(r1.id) ?? 0))
      .slice(0, 2)
      .map(r => `"${r.nombre}" (${etiquetaSeguridad(r.nivelSeguridad).toLowerCase()})`);
    partes.push(`Se basa en ${Math.round(cobertura * 100)}% del trayecto con datos: ${principales.join(' y ')}.`);
  } else {
    partes.push('Hay pocos datos de la comunidad sobre este tramo.');
  }
  if (peligrosCercanos.length > 0) {
    partes.push(`Pasa cerca de: ${peligrosCercanos.slice(0, 2).map(m => `"${m.titulo.replace('⚠️ ', '')}"`).join(' y ')}.`);
  }
  if (cobertura < COBERTURA_MINIMA && peligrosCercanos.length === 0) {
    partes.push('Circula con precaución.');
  }

  return { nivel, motivo: partes.join(' ') };
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
