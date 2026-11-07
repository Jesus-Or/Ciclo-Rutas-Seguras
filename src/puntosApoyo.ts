import { useEffect, useRef, useState } from 'react';
import type { Coordenada } from './types';
import { distanciaMetros } from './enrutamiento';

export interface PuntoApoyo {
  id: string;
  tipo: 'cai' | 'hospital';
  nombre: string;
  posicion: Coordenada;
}

const RADIO_METROS = 3000;   // radio de búsqueda
const REFRESCO_METROS = 1000; // cada cuánto se vuelve a consultar

/** Trae CAI (estaciones de policía) y hospitales cercanos desde OpenStreetMap. */
export function usePuntosApoyo(posicion: Coordenada | null): PuntoApoyo[] {
  const [puntos, setPuntos] = useState<PuntoApoyo[]>([]);
  const ultimaConsulta = useRef<Coordenada | null>(null);
  const buscando = useRef(false);
  const vivo = useRef(true);

  const lat = posicion?.latitud;
  const lon = posicion?.longitud;

  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  useEffect(() => {
    if (lat === undefined || lon === undefined || buscando.current) return;
    const aqui: Coordenada = { latitud: lat, longitud: lon };
    if (ultimaConsulta.current && distanciaMetros(ultimaConsulta.current, aqui) < REFRESCO_METROS) return;

    buscando.current = true;
    const consulta =
      `[out:json][timeout:20];(` +
      `nwr["amenity"="police"](around:${RADIO_METROS},${lat},${lon});` +
      `nwr["amenity"="hospital"](around:${RADIO_METROS},${lat},${lon});` +
      `);out center tags 80;`;

    fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(consulta))
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(datos => {
        if (!vivo.current) return;
        ultimaConsulta.current = aqui;
        const lista: PuntoApoyo[] = (datos.elements ?? [])
          .map((e: any): PuntoApoyo | null => {
            const la = e.lat ?? e.center?.lat;
            const lo = e.lon ?? e.center?.lon;
            if (la === undefined || lo === undefined) return null;
            const esCai = e.tags?.amenity === 'police';
            return {
              id: `${e.type}-${e.id}`,
              tipo: esCai ? 'cai' : 'hospital',
              nombre: e.tags?.name || (esCai ? 'CAI / Estación de policía' : 'Hospital'),
              posicion: { latitud: la, longitud: lo },
            };
          })
          .filter(Boolean) as PuntoApoyo[];
        setPuntos(lista);
      })
      .catch(() => { /* sin conexión o servidor ocupado: se reintenta al moverte */ })
      .finally(() => { buscando.current = false; });
  }, [lat, lon]);

  return puntos;
}