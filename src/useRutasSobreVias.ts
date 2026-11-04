import { useEffect, useState } from 'react';
import type { RutaCiclista, Coordenada } from './types';
import { calcularRutaReal, muestrear } from './enrutamiento';

export function useRutasSobreVias(rutas: RutaCiclista[]) {
  const [ajustadas, setAjustadas] = useState<Record<string, Coordenada[]>>({});

  useEffect(() => {
    const controlador = new AbortController();

    (async () => {
      for (const ruta of rutas) {
        if (controlador.signal.aborted) return;
        if (ruta.coordenadas.length < 2) continue;

        const clave = `ruta-vias-v1:${ruta.id}:${ruta.coordenadas.length}`;
        try {
          const guardado = localStorage.getItem(clave);
          if (guardado) {
            setAjustadas(prev => ({ ...prev, [ruta.id]: JSON.parse(guardado) }));
            continue;
          }
        } catch { /* sin caché */ }

        try {
          const calculada = await calcularRutaReal(muestrear(ruta.coordenadas, 25), controlador.signal);
          setAjustadas(prev => ({ ...prev, [ruta.id]: calculada.coordenadas }));
          try { localStorage.setItem(clave, JSON.stringify(calculada.coordenadas)); } catch { /* cuota */ }
        } catch (e: any) {
          if (e?.name !== 'AbortError') console.warn(`No se pudo ajustar la ruta ${ruta.id}`, e);
        }
        await new Promise(r => setTimeout(r, 400)); // respeta el servidor público
      }
    })();

    return () => controlador.abort();
  }, [rutas]);

  return ajustadas;
}