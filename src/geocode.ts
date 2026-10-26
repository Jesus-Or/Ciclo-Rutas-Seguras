// ── Búsqueda de lugares por nombre (Nominatim / OpenStreetMap) ──
// Servicio gratuito, sin necesidad de API key. Mismo proveedor que
// ya usamos para las tiles del mapa (Leaflet + OpenStreetMap).

export interface ResultadoGeocodificacion {
  nombreMostrado: string;
  latitud: number;
  longitud: number;
}

// Caja aproximada alrededor de Bogotá, para priorizar resultados
// locales y evitar que "Chapinero" traiga resultados de otro país.
const CAJA_BOGOTA = '-74.25,4.45,-73.95,4.85';

export async function buscarLugar(consulta: string): Promise<ResultadoGeocodificacion[]> {
  const recortado = consulta.trim();
  if (recortado.length < 3) return [];

  const parametros = new URLSearchParams({
    format: 'json',
    q: recortado,
    limit: '5',
    viewbox: CAJA_BOGOTA,
    bounded: '0', // prioriza la zona pero no excluye resultados fuera de ella
    countrycodes: 'co',
  });

  const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros.toString()}`, {
    headers: {
      // Nominatim pide identificar la app que consume el servicio
      'Accept-Language': 'es',
    },
  });

  if (!respuesta.ok) throw new Error('No se pudo conectar con el servicio de búsqueda de lugares');

  const datos = await respuesta.json();

  return (datos as any[]).map(item => ({
    nombreMostrado: item.display_name as string,
    latitud: parseFloat(item.lat),
    longitud: parseFloat(item.lon),
  }));
}
