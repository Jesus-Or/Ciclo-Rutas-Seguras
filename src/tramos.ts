import type { Coordenada, MarcadorMapa, ReporteIncidente, RutaCiclista } from './types';
import { aRadianes, distanciaHaversineKm, etiquetaSeguridad, promedioCalificacion } from './utils';

export interface ProyeccionTramo {
  desvioM: number;   // distancia del ciclista al tramo seleccionado
  avanceM: number;   // metros recorridos sobre el tramo
  totalM: number;
}

// Distancia mínima (m) de un punto a la polilínea del tramo, y avance sobre ella
export function proyectarEnTramo(coordenadas: Coordenada[], pos: Coordenada): ProyeccionTramo {
  const mLat = 110570;
  const mLng = 111320 * Math.cos(aRadianes(pos.latitud));
  let mejor = Infinity;
  let avance = 0;
  let acumulado = 0;
  for (let i = 0; i < coordenadas.length - 1; i++) {
    const a = coordenadas[i], b = coordenadas[i + 1];
    const ax = (a.longitud - pos.longitud) * mLng, ay = (a.latitud - pos.latitud) * mLat;
    const bx = (b.longitud - pos.longitud) * mLng, by = (b.latitud - pos.latitud) * mLat;
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    const largo = Math.sqrt(l2);
    if (d < mejor) { mejor = d; avance = acumulado + t * largo; }
    acumulado += largo;
  }
  return { desvioM: mejor, avanceM: avance, totalM: acumulado };
}

// Texto hablado: qué se sabe del tramo según calificaciones, reportes y puntos de precaución cercanos
export function estadisticaTramo(
  ruta: RutaCiclista,
  incidentes: ReporteIncidente[],
  marcadores: MarcadorMapa[],
): string {
  const partes: string[] = [`Tramo de seguridad ${etiquetaSeguridad(ruta.nivelSeguridad).toLowerCase()}.`];

  const n = ruta.calificaciones.length;
  if (n > 0) {
    partes.push(`Los ciclistas lo calificaron con ${promedioCalificacion(ruta).toFixed(1).replace('.', ',')} de 5, en ${n} ${n === 1 ? 'calificación' : 'calificaciones'}.`);
  }

  const reportes = incidentes.filter(i => i.idRuta === ruta.id);
  if (reportes.length > 0) {
    const conteo = new Map<string, number>();
    reportes.forEach(r => conteo.set(r.tipo, (conteo.get(r.tipo) ?? 0) + 1));
    const [tipoFrecuente] = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1])[0];
    partes.push(`Hay ${reportes.length} ${reportes.length === 1 ? 'reporte' : 'reportes'} de incidentes; el más frecuente: ${tipoFrecuente.toLowerCase()}.`);
  }

  const cerca = marcadores.filter(m =>
    (m.tipo === 'peligro' || m.tipo === 'incidente') &&
    ruta.coordenadas.some(c => distanciaHaversineKm(c, m.posicion) * 1000 <= 120),
  ).length;
  if (cerca > 0) partes.push(`Hay ${cerca} ${cerca === 1 ? 'zona de precaución' : 'zonas de precaución'} sobre el tramo.`);

  if (ruta.nivelSeguridad === 'peligrosa') partes.push('Puede haber riesgo de robos o accidentes. Extrema las precauciones y mantente visible.');
  else if (ruta.nivelSeguridad === 'moderada') partes.push('Puede haber tráfico mixto o tramos con poca iluminación. Ve atento.');
  else partes.push('Por lo general es un tramo tranquilo. Aun así, mantente atento.');

  return partes.join(' ');
}

// Resumen corto para el panel
export function resumenTramo(ruta: RutaCiclista, incidentes: ReporteIncidente[]): string {
  const rep = incidentes.filter(i => i.idRuta === ruta.id).length;
  const cal = ruta.calificaciones.length ? `★ ${promedioCalificacion(ruta).toFixed(1)}` : 'sin calificar';
  return `${etiquetaSeguridad(ruta.nivelSeguridad)} · ${cal} · ${rep} reporte${rep === 1 ? '' : 's'}`;
}
