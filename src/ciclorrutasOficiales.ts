import type { FeatureCollection, Feature, LineString } from 'geojson';
import type { Coordenada } from './types';

// Ciclorrutas oficiales de Bogotá (Datos Abiertos Bogotá / IDU).
// Descarga el GeoJSON y guárdalo como:  public/datos/ciclorutas.geojson
// Si el archivo no existe, la app funciona igual (solo no muestra esta capa).

const RUTA_ARCHIVO = `${import.meta.env.BASE_URL}datos/ciclorutas.geojson`;

type Posicion = number[];

// Busca un nombre legible en las propiedades (los campos cambian según la versión del archivo)
function buscarNombre(propiedades: Record<string, unknown> | null | undefined): string {
  if (!propiedades) return '';
  for (const [clave, valor] of Object.entries(propiedades)) {
    if (typeof valor === 'string' && valor.trim() && /nombre|name|^nom|via|tramo|ubica|cicloruta/i.test(clave)) {
      return valor.trim();
    }
  }
  return '';
}

// Quita puntos casi iguales (~9 m) para que el mapa vaya fluido
function aligerarLinea(linea: Posicion[]): Posicion[] {
  if (linea.length <= 2) return linea;
  const salida: Posicion[] = [linea[0]];
  for (let i = 1; i < linea.length - 1; i++) {
    const ult = salida[salida.length - 1];
    if (Math.abs(linea[i][0] - ult[0]) + Math.abs(linea[i][1] - ult[1]) > 0.00008) salida.push(linea[i]);
  }
  salida.push(linea[linea.length - 1]);
  return salida;
}

export interface ResultadoCiclorrutas {
  datos: FeatureCollection<LineString, { nombre: string }>;
  tramos: number;
}

export async function cargarCiclorrutasOficiales(): Promise<ResultadoCiclorrutas | null> {
  try {
    const respuesta = await fetch(RUTA_ARCHIVO);
    if (!respuesta.ok) return null;
    const crudo = await respuesta.json();           // si el servidor devuelve HTML, falla y se ignora
    const entrada: Feature[] = crudo?.type === 'FeatureCollection' ? crudo.features : crudo?.type === 'Feature' ? [crudo] : [];

    const salida: Feature<LineString, { nombre: string }>[] = [];
    for (const f of entrada) {
      const g = f?.geometry as { type: string; coordinates: unknown } | null;
      if (!g) continue;
      const nombre = buscarNombre(f.properties as Record<string, unknown> | null);
      let lineas: Posicion[][] = [];
      if (g.type === 'LineString') lineas = [g.coordinates as Posicion[]];
      else if (g.type === 'MultiLineString') lineas = g.coordinates as Posicion[][];
      else continue;

      for (const linea of lineas) {
        if (!Array.isArray(linea) || linea.length < 2) continue;
        // Coordenadas en metros (no WGS84): no se pueden dibujar directo
        if (Math.abs(linea[0][0]) > 180 || Math.abs(linea[0][1]) > 90) {
          console.warn('El GeoJSON de ciclorrutas no está en WGS84 (EPSG:4326). Descarga la versión GeoJSON.');
          return null;
        }
        salida.push({
          type: 'Feature',
          properties: { nombre },
          geometry: { type: 'LineString', coordinates: aligerarLinea(linea) },
        });
      }
    }
    if (!salida.length) return null;
    return { datos: { type: 'FeatureCollection', features: salida }, tramos: salida.length };
  } catch {
    return null;
  }
}

// ── ¿Qué parte del recorrido va por ciclorruta oficial? ───────────────────────
// Se compara el recorrido con los tramos oficiales (a menos de ~20 m).
const CELDA = 0.0003;               // ~33 m
const RADIO_M = 20;
const indices = new WeakMap<object, Map<string, number[][]>>();

const claveCelda = (lat: number, lon: number) => `${Math.floor(lat / CELDA)}_${Math.floor(lon / CELDA)}`;

function indexar(datos: ResultadoCiclorrutas): Map<string, number[][]> {
  const guardado = indices.get(datos);
  if (guardado) return guardado;
  const mapa = new Map<string, number[][]>();
  const meter = (lat: number, lon: number) => {
    const k = claveCelda(lat, lon);
    const lista = mapa.get(k);
    if (lista) lista.push([lat, lon]); else mapa.set(k, [[lat, lon]]);
  };
  for (const f of datos.datos.features) {
    const c = f.geometry.coordinates;
    for (let i = 0; i < c.length; i++) {
      meter(c[i][1], c[i][0]);
      // Se agregan puntos intermedios (~10 m) para no perder los tramos rectos largos
      if (i > 0) {
        const largoM = Math.hypot((c[i][1] - c[i - 1][1]) * 110570, (c[i][0] - c[i - 1][0]) * 111320 * Math.cos(c[i][1] * Math.PI / 180));
        const n = Math.min(400, Math.floor(largoM / 10));
        for (let j = 1; j < n; j++) {
          meter(c[i - 1][1] + ((c[i][1] - c[i - 1][1]) * j) / n, c[i - 1][0] + ((c[i][0] - c[i - 1][0]) * j) / n);
        }
      }
    }
  }
  indices.set(datos, mapa);
  return mapa;
}

// Devuelve un número de 0 a 100, o null si no hay datos oficiales cargados
export function porcentajeSobreCiclorruta(trazado: Coordenada[], datos: ResultadoCiclorrutas | null): number | null {
  if (!datos || trazado.length < 2) return null;
  const mapa = indexar(datos);
  // Se densifica el recorrido (un punto cada ~10 m) para no perder tramos largos entre vértices
  let sobre = 0, total = 0;
  for (let i = 1; i < trazado.length; i++) {
    const a = trazado[i - 1], b = trazado[i];
    const largoM = Math.hypot((b.latitud - a.latitud) * 110570, (b.longitud - a.longitud) * 111320 * Math.cos(a.latitud * Math.PI / 180));
    const pasos = Math.max(1, Math.round(largoM / 10));
    for (let j = 0; j < pasos; j++) {
      const lat = a.latitud + ((b.latitud - a.latitud) * j) / pasos;
      const lon = a.longitud + ((b.longitud - a.longitud) * j) / pasos;
      total++;
      const cy = Math.floor(lat / CELDA), cx = Math.floor(lon / CELDA);
      let cerca = false;
      for (let dy = -1; dy <= 1 && !cerca; dy++) {
        for (let dx = -1; dx <= 1 && !cerca; dx++) {
          const celda = mapa.get(`${cy + dy}_${cx + dx}`);
          if (!celda) continue;
          for (const [plat, plon] of celda) {
            const d = Math.hypot((plat - lat) * 110570, (plon - lon) * 111320 * Math.cos(lat * Math.PI / 180));
            if (d <= RADIO_M) { cerca = true; break; }
          }
        }
      }
      if (cerca) sobre++;
    }
  }
  return total ? Math.round((sobre / total) * 100) : null;
}
