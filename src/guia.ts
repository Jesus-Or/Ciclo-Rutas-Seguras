import { useEffect, useRef, useState } from 'react';
import type { Coordenada, MarcadorMapa, ReporteIncidente, RutaCiclista } from './types';
import { estadisticaTramo, proyectarEnTramo, resumenTramo } from './tramos';
import type { PasoRuta, RutaCalculada } from './ruteo';
import { sectorEn } from './ruteo';
import { distanciaHaversineKm, aRadianes } from './utils';
import { hablar, distanciaHablada } from './voz';

// ── Geometría: dónde va el usuario sobre el recorrido ──────────────────────
export interface ProyeccionRuta {
  indice: number;     // tramo del recorrido donde está
  avanceM: number;    // metros recorridos desde el inicio
  desvioM: number;    // distancia al recorrido (si es grande, se salió)
}

function proyectarEnTramos(ruta: RutaCalculada, pos: Coordenada, desde: number, hasta: number): ProyeccionRuta {
  const mPorGradoLat = 110570;
  const mPorGradoLng = 111320 * Math.cos(aRadianes(pos.latitud));
  let mejor: ProyeccionRuta = { indice: desde, avanceM: ruta.acumuladoM[desde] ?? 0, desvioM: Infinity };
  for (let i = desde; i <= hasta; i++) {
    const a = ruta.puntos[i];
    const b = ruta.puntos[i + 1];
    const ax = (a.longitud - pos.longitud) * mPorGradoLng, ay = (a.latitud - pos.latitud) * mPorGradoLat;
    const bx = (b.longitud - pos.longitud) * mPorGradoLng, by = (b.latitud - pos.latitud) * mPorGradoLat;
    const dx = bx - ax, dy = by - ay;
    const largo2 = dx * dx + dy * dy;
    const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / largo2));
    const distancia = Math.hypot(ax + t * dx, ay + t * dy);
    if (distancia < mejor.desvioM) {
      mejor = { indice: i, avanceM: ruta.acumuladoM[i] + t * Math.sqrt(largo2), desvioM: distancia };
    }
  }
  return mejor;
}

export function proyectarEnRuta(ruta: RutaCalculada, pos: Coordenada, desde = 0): ProyeccionRuta {
  const ultimo = ruta.puntos.length - 2;
  if (ultimo < 0) return { indice: 0, avanceM: 0, desvioM: 0 };
  const inicio = Math.max(0, Math.min(ultimo, desde - 2));
  const fin = Math.min(ultimo, desde + 150);
  const local = proyectarEnTramos(ruta, pos, inicio, fin);
  // Si no hay coincidencia cerca, se busca en todo el recorrido (por si el usuario saltó adelante)
  if (local.desvioM > 150 && (inicio > 0 || fin < ultimo)) {
    const global = proyectarEnTramos(ruta, pos, 0, ultimo);
    if (global.desvioM < local.desvioM) return global;
  }
  return local;
}

// ── Estado que muestra el panel ────────────────────────────────────────
export interface EstadoGuia {
  paso: PasoRuta | null;      // próxima maniobra
  distanciaAlPasoM: number;
  calleActual: string;
  restanteKm: number;
  restanteMin: number;
  desviado: boolean;
  sector: string;
  tramo: string;            // nombre del tramo seleccionado
  tramoResumen: string;
  desvioTramoM: number | null;  // metros fuera del tramo seleccionado (null si no hay tramo)
  enTramo: boolean;
}

export const ESTADO_GUIA_INICIAL: EstadoGuia = {
  paso: null, distanciaAlPasoM: 0, calleActual: '', restanteKm: 0, restanteMin: 0, desviado: false, sector: '',
  tramo: '', tramoResumen: '', desvioTramoM: null, enTramo: false,
};

interface OpcionesGuia {
  ruta: RutaCalculada | null;
  activa: boolean;
  posicion: Coordenada | null;
  marcadores: MarcadorMapa[];
  velocidadKmh: number;
  tramo?: RutaCiclista | null;
  incidentes?: ReporteIncidente[];
  alDesviarse: () => void;
}

const limpiarTitulo = (t: string) => t.replace(/[^\p{L}\p{N}\s.,-]/gu, '').replace(/\s+/g, ' ').trim();

// Guía por voz y en pantalla: giros, cambios de calle, sector/barrio, puntos de interés,
// zonas de precaución, avance del recorrido y recálculo si el usuario se sale de la ruta.
export function useGuia({ ruta, activa, posicion, marcadores, velocidadKmh, tramo = null, incidentes = [], alDesviarse }: OpcionesGuia): EstadoGuia {
  const [estado, setEstado] = useState<EstadoGuia>(ESTADO_GUIA_INICIAL);

  const anunciados = useRef(new Set<string>());
  const indice = useRef(0);
  const desviosSeguidos = useRef(0);
  const ultimoRecalculo = useRef(0);
  const sector = useRef({ nombre: '', posicion: null as Coordenada | null, hora: 0, consultando: false });
  const tramoEst = useRef({ en: null as boolean | null, fuera: 0, dentro: 0, ultimoAviso: 0, ultimoDesvio: 0 });
  const alDesviarseRef = useRef(alDesviarse);
  alDesviarseRef.current = alDesviarse;

  // Cada recorrido nuevo reinicia el avance (los avisos de marcadores y sectores se conservan)
  const idRuta = ruta?.id;
  const idTramo = tramo?.id;
  useEffect(() => {
    tramoEst.current = { en: null, fuera: 0, dentro: 0, ultimoAviso: 0, ultimoDesvio: 0 };
  }, [idTramo]);
  useEffect(() => {
    indice.current = 0;
    desviosSeguidos.current = 0;
    for (const clave of Array.from(anunciados.current)) if (!clave.startsWith('m-')) anunciados.current.delete(clave);
  }, [idRuta]);

  // Al apagar la guía se limpia todo
  useEffect(() => {
    if (activa) return;
    anunciados.current.clear();
    sector.current = { nombre: '', posicion: null, hora: 0, consultando: false };
    setEstado(ESTADO_GUIA_INICIAL);
  }, [activa]);

  useEffect(() => {
    if (!activa || !ruta || !posicion || ruta.puntos.length < 2) return;

    const total = ruta.acumuladoM[ruta.acumuladoM.length - 1];
    const p = proyectarEnRuta(ruta, posicion, indice.current);
    indice.current = p.indice;
    const restanteM = Math.max(0, total - p.avanceM);

    // Próxima maniobra y calle actual
    const siguiente = ruta.pasos.findIndex(s => s.maniobra !== 'depart' && s.distanciaAcumM > p.avanceM + 3);
    const paso = siguiente >= 0 ? ruta.pasos[siguiente] : null;
    const distanciaAlPasoM = paso ? Math.max(0, paso.distanciaAcumM - p.avanceM) : 0;
    let actual = 0;
    ruta.pasos.forEach((s, i) => { if (s.distanciaAcumM <= p.avanceM + 3) actual = i; });
    const calleActual = ruta.pasos[actual]?.calle ?? '';

    const dicho = (clave: string) => {
      if (anunciados.current.has(clave)) return true;
      anunciados.current.add(clave);
      return false;
    };
    const vibrar = () => { try { navigator.vibrate?.(200); } catch { /* sin vibración */ } };

    // 1) Giros y maniobras
    if (paso && siguiente >= 0) {
      if (paso.maniobra === 'arrive') {
        if (distanciaAlPasoM <= 150 && total > 400 && !dicho(`${idRuta}-fin-150`)) {
          hablar(`Tu destino está a ${distanciaHablada(distanciaAlPasoM)}.`);
        }
      } else {
        const largoPaso = paso.distanciaAcumM - (ruta.pasos[siguiente - 1]?.distanciaAcumM ?? 0);
        if (distanciaAlPasoM <= 250 && largoPaso > 350 && !dicho(`${idRuta}-${siguiente}-lejos`)) {
          hablar(`En ${distanciaHablada(Math.round(distanciaAlPasoM / 50) * 50 || 50)}, ${paso.instruccion.charAt(0).toLowerCase()}${paso.instruccion.slice(1)}.`);
        }
        if (distanciaAlPasoM <= 40 && !dicho(`${idRuta}-${siguiente}-cerca`)) {
          hablar(`${paso.instruccion}.`, true);
          vibrar();
        }
      }
    }

    // 2) Cambio de calle sin giro: "Ahora vas por ..."
    const pasoActual = ruta.pasos[actual];
    if (pasoActual && actual > 0 && pasoActual.calle && pasoActual.calle !== ruta.pasos[actual - 1]?.calle
        && !['turn', 'end of road', 'fork', 'roundabout', 'rotary', 'arrive'].includes(pasoActual.maniobra)
        && p.avanceM >= pasoActual.distanciaAcumM + 15 && !dicho(`${idRuta}-${actual}-calle`)) {
      hablar(`Ahora vas por ${pasoActual.calle}.`);
    }

    // 3) Avance del recorrido
    if (total >= 2500) {
      if (p.avanceM >= total / 2 && restanteM > 1200 && !dicho(`${idRuta}-mitad`)) {
        hablar(`Vas por la mitad del recorrido. Te faltan ${distanciaHablada(restanteM)}.`);
      }
      if (restanteM <= 1000 && restanteM > 600 && !dicho(`${idRuta}-1km`)) hablar('Te falta aproximadamente un kilómetro.');
      if (restanteM <= 500 && restanteM > 200 && !dicho(`${idRuta}-500m`)) hablar('Te faltan quinientos metros.');
    }

    // 4) Zonas de precaución y puntos de interés cercanos
    for (const m of marcadores) {
      if (m.tipo !== 'peligro' && m.tipo !== 'incidente' && m.tipo !== 'interes') continue;
      if (distanciaHaversineKm(m.posicion, posicion) * 1000 > 130) continue;
      if (dicho(`m-${m.id}`)) continue;
      const nombre = limpiarTitulo(m.titulo);
      if (m.tipo === 'interes') hablar(`Pasas cerca de ${nombre}.`);
      else { hablar(`Precaución. ${nombre}, cerca de tu ubicación.`, true); vibrar(); }
    }

    // 5) Sector o barrio (se consulta cada ~300 m o 30 s como mínimo)
    const s = sector.current;
    const ahora = Date.now();
    const movido = s.posicion ? distanciaHaversineKm(s.posicion, posicion) * 1000 : Infinity;
    if (!s.consultando && movido > 300 && ahora - s.hora > 30000) {
      s.consultando = true;
      s.posicion = posicion;
      s.hora = ahora;
      void sectorEn(posicion).then(nombre => {
        s.consultando = false;
        if (nombre && nombre !== s.nombre) {
          const primera = s.nombre === '';
          s.nombre = nombre;
          if (!primera) hablar(`Entras al sector ${nombre}.`);
          setEstado(e => ({ ...e, sector: nombre }));
        }
      });
    }

    // 6) Desvío: si se aleja de la ruta varias lecturas seguidas, se recalcula
    desviosSeguidos.current = p.desvioM > 70 ? desviosSeguidos.current + 1 : 0;
    const desviado = desviosSeguidos.current >= 3;
    if (desviado && ahora - ultimoRecalculo.current > 20000) {
      ultimoRecalculo.current = ahora;
      desviosSeguidos.current = 0;
      hablar('Te saliste de la ruta. Recalculando.', true);
      alDesviarseRef.current();
    }

    // 7) Tramo seleccionado: desvío en metros y estadísticas
    let desvioTramoM: number | null = null;
    let enTramo = false;
    if (tramo && tramo.coordenadas.length > 1) {
      const te = tramoEst.current;
      const pt = proyectarEnTramo(tramo.coordenadas, posicion);
      desvioTramoM = pt.desvioM;
      if (pt.desvioM > 40) { te.fuera++; te.dentro = 0; } else if (pt.desvioM <= 30) { te.dentro++; te.fuera = 0; }
      const nombreTramo = limpiarTitulo(tramo.nombre);
      const sectorAhora = sector.current.nombre;
      if (te.fuera >= 3) {
        const redondo = Math.round(pt.desvioM / 10) * 10;
        if (te.en !== false || (ahora - te.ultimoAviso > 30000 && Math.abs(redondo - te.ultimoDesvio) >= 50)) {
          te.en = false; te.ultimoAviso = ahora; te.ultimoDesvio = redondo;
          hablar(`Vas desviado ${distanciaHablada(redondo)} del tramo ${nombreTramo}.`, true);
          vibrar();
        }
      } else if (te.dentro >= 2) {
        if (te.en !== true) {
          const volvio = te.en === false;
          te.en = true; te.ultimoAviso = ahora;
          const donde = sectorAhora ? `, sector ${sectorAhora}` : '';
          hablar(volvio
            ? `Volviste al tramo ${nombreTramo}.`
            : `Vas por el tramo ${nombreTramo}${donde}. ${estadisticaTramo(tramo, incidentes, marcadores)}`);
        }
      }
      enTramo = te.en === true;
    }

    setEstado(anterior => ({
      paso,
      distanciaAlPasoM,
      calleActual,
      restanteKm: restanteM / 1000,
      restanteMin: (restanteM / 1000 / Math.max(5, velocidadKmh)) * 60,
      desviado,
      sector: anterior.sector,
      tramo: tramo ? tramo.nombre : '',
      tramoResumen: tramo ? resumenTramo(tramo, incidentes) : '',
      desvioTramoM,
      enTramo,
    }));
  }, [posicion, ruta, activa, marcadores, velocidadKmh, idRuta, tramo, incidentes]);

  return estado;
}
