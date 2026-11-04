import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordenada } from './types';
import { distanciaHaversineKm } from './utils';

// ── Registro automático de lo que el usuario recorre ─────────────────────
// Empieza solo cuando detecta que te moviste ~30 m y se guarda en el historial.

export interface Recorrido {
  id: string;
  inicio: string;            // fecha ISO
  fin: string;               // fecha ISO
  distanciaKm: number;
  segundos: number;
  velocidadMediaKmh: number;
  velocidadMaxKmh: number;
  puntos: Coordenada[];
  rutaNombre?: string;       // si seguía una ruta elegida
}

const DISTANCIA_PARA_EMPEZAR_KM = 0.03;   // 30 m
const DISTANCIA_MINIMA_GUARDAR_KM = 0.1;  // recorridos menores a 100 m se descartan
const INACTIVIDAD_MS = 5 * 60 * 1000;     // 5 min sin moverse = recorrido terminado
const MAX_HISTORIAL = 50;
const MAX_PUNTOS_GUARDADOS = 1500;

const clave = (id: string) => `ciclorutas_recorridos_${id}`;

function leerHistorial(id: string): Recorrido[] {
  try {
    const texto = localStorage.getItem(clave(id));
    return texto ? (JSON.parse(texto) as Recorrido[]) : [];
  } catch { return []; }
}

function guardarHistorial(id: string, lista: Recorrido[]) {
  try { localStorage.setItem(clave(id), JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
}

// Reduce la cantidad de puntos para no llenar el almacenamiento
function aligerar(puntos: Coordenada[]): Coordenada[] {
  if (puntos.length <= MAX_PUNTOS_GUARDADOS) return puntos;
  const salto = Math.ceil(puntos.length / MAX_PUNTOS_GUARDADOS);
  const salida = puntos.filter((_, i) => i % salto === 0);
  const ultimo = puntos[puntos.length - 1];
  if (salida[salida.length - 1] !== ultimo) salida.push(ultimo);
  return salida;
}

export function useRecorrido(idUsuario: string, alInactividad?: () => void) {
  const [activo, setActivo] = useState(false);
  const [puntos, setPuntos] = useState<Coordenada[]>([]);
  const [distanciaKm, setDistanciaKm] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [historial, setHistorial] = useState<Recorrido[]>(() => leerHistorial(idUsuario));

  const r = useRef({
    activo: false,
    ancla: null as Coordenada | null,
    puntos: [] as Coordenada[],
    distancia: 0,
    inicioMs: 0,
    ultimoMs: 0,
    ultimoMovimientoMs: 0,
    velMax: 0,
  });

  const alInactividadRef = useRef(alInactividad);
  alInactividadRef.current = alInactividad;

  // Cambia de usuario → carga su historial
  useEffect(() => { setHistorial(leerHistorial(idUsuario)); }, [idUsuario]);

  // Cronómetro del recorrido
  useEffect(() => {
    if (!activo) return;
    const intervalo = setInterval(() => setSegundos(Math.floor((Date.now() - r.current.inicioMs) / 1000)), 1000);
    return () => clearInterval(intervalo);
  }, [activo]);

  // Si no te mueves por varios minutos, se avisa para cerrar el recorrido
  useEffect(() => {
    if (!activo) return;
    const intervalo = setInterval(() => {
      if (Date.now() - r.current.ultimoMovimientoMs > INACTIVIDAD_MS) alInactividadRef.current?.();
    }, 15000);
    return () => clearInterval(intervalo);
  }, [activo]);

  // Cada posición nueva del GPS (ya filtrada por ruido) entra aquí
  const registrarPunto = useCallback((c: Coordenada) => {
    const x = r.current;
    const ahora = Date.now();
    if (!x.activo) {
      if (!x.ancla) { x.ancla = c; return; }
      const d = distanciaHaversineKm(x.ancla, c);
      if (d < DISTANCIA_PARA_EMPEZAR_KM) return;
      x.activo = true;
      x.puntos = [x.ancla, c];
      x.distancia = d;
      x.inicioMs = ahora;
      x.ultimoMs = ahora;
      x.ultimoMovimientoMs = ahora;
      x.velMax = 0;
      setActivo(true);
      setSegundos(0);
    } else {
      const ultimo = x.puntos[x.puntos.length - 1];
      const d = distanciaHaversineKm(ultimo, c);
      const horas = (ahora - x.ultimoMs) / 3600000;
      if (horas > 0) {
        const v = d / horas;
        if (v < 120 && v > x.velMax) x.velMax = v;   // descarta saltos raros del GPS
      }
      x.distancia += d;
      x.puntos.push(c);
      x.ultimoMs = ahora;
      x.ultimoMovimientoMs = ahora;
    }
    setPuntos(x.puntos.slice());
    setDistanciaKm(x.distancia);
  }, []);

  // Cierra el recorrido; devuelve el resumen o null si fue demasiado corto
  const terminar = useCallback((rutaNombre?: string): Recorrido | null => {
    const x = r.current;
    if (!x.activo) return null;
    const ahora = Date.now();
    const segs = Math.max(1, Math.round((ahora - x.inicioMs) / 1000));
    const km = x.distancia;
    const ultimo = x.puntos[x.puntos.length - 1] ?? null;
    const resumen: Recorrido = {
      id: `rec-${ahora}`,
      inicio: new Date(x.inicioMs).toISOString(),
      fin: new Date(ahora).toISOString(),
      distanciaKm: Math.round(km * 100) / 100,
      segundos: segs,
      velocidadMediaKmh: Math.round((km / (segs / 3600)) * 10) / 10,
      velocidadMaxKmh: Math.round(x.velMax * 10) / 10,
      puntos: aligerar(x.puntos),
      rutaNombre,
    };
    // Reinicia el estado
    x.activo = false; x.puntos = []; x.distancia = 0; x.ancla = ultimo;
    setActivo(false); setPuntos([]); setDistanciaKm(0); setSegundos(0);
    if (km < DISTANCIA_MINIMA_GUARDAR_KM) return null;
    setHistorial(anterior => {
      const nuevo = [resumen, ...anterior].slice(0, MAX_HISTORIAL);
      guardarHistorial(idUsuario, nuevo);
      return nuevo;
    });
    return resumen;
  }, [idUsuario]);

  const borrarHistorial = useCallback(() => {
    setHistorial([]);
    guardarHistorial(idUsuario, []);
  }, [idUsuario]);

  return { activo, puntos, distanciaKm, segundos, historial, registrarPunto, terminar, borrarHistorial };
}
