import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordenada, PasoRuta, RutaCalculada } from './types';
import {
  distanciaMetros,
  distanciaAPolilinea,
  formatearDuracionVoz,
  obtenerSector,
} from './enrutamiento';

interface Opciones {
  ruta: RutaCalculada | null;
  posicion: Coordenada | null;   // GPS del usuario
  activa: boolean;               // true mientras la ruta está en curso y calculada
  segundos: number;              // cronómetro (lo lleva App)
  voz: boolean;                  // false = silenciado
  alDesviarse?: () => void;      // para recalcular la ruta
  alFinalizar?: (segundos: number) => void;
}

const UMBRAL_AVISO_LEJOS = 150;   // "En 150 metros, gira..."
const UMBRAL_AVISO_CERCA = 40;    // "Gira a la derecha"
const UMBRAL_PASO_SUPERADO = 20;
const UMBRAL_LLEGADA = 25;
const UMBRAL_DESVIO = 50;         // metros fuera de la ruta
const LECTURAS_PARA_DESVIO = 3;
const DISTANCIA_SECTOR = 700;     // cada cuántos metros se consulta el barrio

/** Devuelve true si realmente habló. */
export function hablar(texto: string, sinInterrumpir = false): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const s = window.speechSynthesis;
  if (sinInterrumpir) {
    if (s.speaking || s.pending) return false;
  } else {
    s.cancel();
  }
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'es-CO';
  u.rate = 1;
  s.speak(u);
  return true;
}

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const redondear10 = (m: number) => Math.max(10, Math.round(m / 10) * 10);

export function useGuiaRuta({ ruta, posicion, activa, segundos, voz, alDesviarse, alFinalizar }: Opciones) {
  const [indicePaso, setIndicePaso] = useState(1);
  const [distanciaAlPaso, setDistanciaAlPaso] = useState<number | null>(null);
  const [distanciaRestante, setDistanciaRestante] = useState<number | null>(null);
  const [finalizada, setFinalizada] = useState(false);

  const anunciosRef = useRef<Set<string>>(new Set());
  const desviosRef = useRef(0);
  const ultimoRecalculoRef = useRef(0);
  const finalizadaRef = useRef(false);
  const posSectorRef = useRef<Coordenada | null>(null);
  const ultimoSectorRef = useRef<string | null>(null);
  const buscandoSectorRef = useRef(false);

  // Valores que cambian seguido van en refs para no reiniciar efectos
  const segundosRef = useRef(segundos);
  const vozRef = useRef(voz);
  const alDesviarseRef = useRef(alDesviarse);
  const alFinalizarRef = useRef(alFinalizar);
  segundosRef.current = segundos;
  vozRef.current = voz;
  alDesviarseRef.current = alDesviarse;
  alFinalizarRef.current = alFinalizar;

  const decir = (texto: string, sinInterrumpir = false) =>
    vozRef.current ? hablar(texto, sinInterrumpir) : false;

  const detener = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  // Termina el recorrido (por llegada o por el botón "Terminé la ruta")
  const finalizar = useCallback(() => {
    const total = segundosRef.current;
    if (!finalizadaRef.current) {
      finalizadaRef.current = true;
      setFinalizada(true);
      if (vozRef.current) hablar(`Has culminado tu recorrido. Tardaste ${formatearDuracionVoz(total)}.`);
    }
    alFinalizarRef.current?.(total);
  }, []);

  // ── Inicio / reinicio cuando se activa o cambia la ruta ──
  useEffect(() => {
    if (!activa || !ruta) {
      detener();
      finalizadaRef.current = false;
      setFinalizada(false);
      setDistanciaAlPaso(null);
      setDistanciaRestante(null);
      return;
    }
    anunciosRef.current = new Set();
    desviosRef.current = 0;
    finalizadaRef.current = false;
    posSectorRef.current = null;
    setFinalizada(false);
    setIndicePaso(1);
    setDistanciaRestante(ruta.distanciaMetros);

    const primero = ruta.pasos[0];
    const km = (ruta.distanciaMetros / 1000).toFixed(1).replace('.', ',');
    decir(
      `${primero?.instruccion ?? 'Inicia tu recorrido'}. Tu destino está a ${km} kilómetros.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa, ruta]);

  // ── Seguimiento de posición ──
  useEffect(() => {
    if (!activa || !ruta || !posicion || finalizadaRef.current) return;
    const pasos = ruta.pasos;
    const destino = ruta.coordenadas[ruta.coordenadas.length - 1];
    const dDestino = distanciaMetros(posicion, destino);

    // Distancia restante aproximada
    const siguiente = pasos[indicePaso];
    const restante = siguiente
      ? distanciaMetros(posicion, siguiente.posicion) +
        pasos.slice(indicePaso).reduce((a, p) => a + p.distancia, 0)
      : dDestino;
    setDistanciaRestante(Math.round(restante));

    // 1. ¿Llegó? (solo si ya pasó casi todas las maniobras: evita terminar de inmediato en rutas circulares)
    if (dDestino <= UMBRAL_LLEGADA && indicePaso >= pasos.length - 2) {
      finalizar();
      return;
    }

    // 2. ¿Se desvió de la ruta?
    if (distanciaAPolilinea(posicion, ruta.coordenadas) > UMBRAL_DESVIO) {
      desviosRef.current += 1;
      const pasoTiempo = Date.now() - ultimoRecalculoRef.current > 15000;
      if (desviosRef.current >= LECTURAS_PARA_DESVIO && pasoTiempo) {
        ultimoRecalculoRef.current = Date.now();
        desviosRef.current = 0;
        decir('Te has salido de la ruta. Recalculando.');
        alDesviarseRef.current?.();
        return;
      }
    } else {
      desviosRef.current = 0;
    }

    // 3. ¿Superó alguna de las próximas maniobras?
    for (let j = indicePaso; j < Math.min(indicePaso + 3, pasos.length); j++) {
      if (pasos[j].tipo === 'arrive') break;
      if (distanciaMetros(posicion, pasos[j].posicion) <= UMBRAL_PASO_SUPERADO) {
        setIndicePaso(j + 1);
        return;
      }
    }

    // 4. Avisos de la próxima maniobra
    if (siguiente) {
      const d = distanciaMetros(posicion, siguiente.posicion);
      setDistanciaAlPaso(d);
      const kCerca = `${indicePaso}-cerca`;
      const kLejos = `${indicePaso}-lejos`;

      if (siguiente.tipo === 'arrive') {
        if (d <= UMBRAL_AVISO_LEJOS && !anunciosRef.current.has(kLejos)) {
          anunciosRef.current.add(kLejos);
          decir('Estás por llegar a tu destino.');
        }
      } else if (d <= UMBRAL_AVISO_CERCA && !anunciosRef.current.has(kCerca)) {
        anunciosRef.current.add(kCerca);
        anunciosRef.current.add(kLejos);
        decir(siguiente.instruccion);
      } else if (d <= UMBRAL_AVISO_LEJOS && !anunciosRef.current.has(kLejos)) {
        anunciosRef.current.add(kLejos);
        decir(`En ${redondear10(d)} metros, ${minuscula(siguiente.instruccion)}`);
      }
    }

    // 5. Puntos clave del recorrido (sin interrumpir otras instrucciones)
    const total = ruta.distanciaMetros;
    if (total > 3000 && restante <= total / 2 && !anunciosRef.current.has('mitad')) {
      if (decir('Vas por la mitad del recorrido.', true)) anunciosRef.current.add('mitad');
    }
    if (total > 2500 && restante <= 1000 && !anunciosRef.current.has('1km')) {
      if (decir('Te queda aproximadamente un kilómetro.', true)) anunciosRef.current.add('1km');
    }

    // 6. Sector / barrio por el que vas
    if (!posSectorRef.current) {
      posSectorRef.current = posicion;
    } else if (!buscandoSectorRef.current && distanciaMetros(posSectorRef.current, posicion) >= DISTANCIA_SECTOR) {
      buscandoSectorRef.current = true;
      posSectorRef.current = posicion;
      obtenerSector(posicion)
        .then(sector => {
          if (sector && sector !== ultimoSectorRef.current) {
            ultimoSectorRef.current = sector;
            decir(`Estás pasando por ${sector}.`, true);
          }
        })
        .finally(() => { buscandoSectorRef.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicion, activa, ruta, indicePaso, finalizar]);

  const pasoActual: PasoRuta | null = ruta?.pasos[indicePaso] ?? null;

  return { pasoActual, distanciaAlPaso, distanciaRestante, finalizada, finalizarManual: finalizar, detener };
}