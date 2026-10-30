// ── Búsqueda de lugares y direcciones de Bogotá ─────────────────
// Combina cuatro fuentes, de la más a la menos confiable:
//  1. Lugares conocidos guardados en la app (Monserrate, La Jiménez, etc.). Funcionan sin internet.
//  2. Direcciones colombianas ("Calle 72 # 10-34"): se calcula la esquina entre la calle y la carrera.
//  3. Photon (OpenStreetMap): bueno para sitios y negocios.
//  4. Nominatim (OpenStreetMap): bueno para barrios y vías.
// Todo es gratis y sin API key. Los datos de OpenStreetMap en Bogotá no tienen todos los números
// de puerta, por eso las direcciones se ubican de forma aproximada (a nivel de cuadra).
import { distanciaHaversineKm, aRadianes } from './utils';
import { ubicacionesPredefinidas } from './data';
import { Coordenada } from './types';

export interface ResultadoGeocodificacion {
  nombreMostrado: string;
  latitud: number;
  longitud: number;
}

const CAJA_BOGOTA = '-74.25,4.45,-73.95,4.85'; // oeste, sur, este, norte
const PAUSA_ENTRE_CONSULTAS_MS = 1000;           // Nominatim pide máximo 1 consulta por segundo

// ── 1. Lugares conocidos (coordenadas aproximadas, ±200 m) ──────
interface LugarConocido { nombre: string; latitud: number; longitud: number; alias: string[]; }

const LUGARES_CONOCIDOS: LugarConocido[] = [
  { nombre: 'Monserrate', latitud: 4.6056, longitud: -74.0562, alias: ['monserrate', 'cerro de monserrate', 'santuario de monserrate', 'cerro monserrate'] },
  { nombre: 'La Jiménez (Av. Jiménez con Carrera 7)', latitud: 4.5998, longitud: -74.0737, alias: ['la jimenez', 'avenida jimenez', 'av jimenez', 'jimenez', 'calle 13 con carrera septima', 'eje ambiental'] },
  { nombre: 'Torre Colpatria', latitud: 4.6107, longitud: -74.0696, alias: ['torre colpatria', 'colpatria', 'edificio colpatria'] },
  { nombre: 'Chorro de Quevedo', latitud: 4.5978, longitud: -74.0697, alias: ['chorro de quevedo', 'chorro quevedo'] },
  { nombre: 'La Candelaria', latitud: 4.5960, longitud: -74.0730, alias: ['la candelaria', 'candelaria', 'centro historico'] },
  { nombre: 'Jardín Botánico José Celestino Mutis', latitud: 4.6678, longitud: -74.1001, alias: ['jardin botanico', 'jardin botanico de bogota', 'jose celestino mutis'] },
  { nombre: 'Biblioteca Virgilio Barco', latitud: 4.6565, longitud: -74.0888, alias: ['biblioteca virgilio barco', 'virgilio barco', 'biblioteca barco'] },
  { nombre: 'Universidad de los Andes', latitud: 4.6015, longitud: -74.0661, alias: ['universidad de los andes', 'uniandes', 'los andes'] },
  { nombre: 'Pontificia Universidad Javeriana', latitud: 4.6286, longitud: -74.0644, alias: ['universidad javeriana', 'javeriana', 'pontificia universidad javeriana'] },
  { nombre: 'Terminal de Transporte (Salitre)', latitud: 4.6567, longitud: -74.1147, alias: ['terminal de transporte', 'terminal salitre', 'terminal de buses'] },
  ...ubicacionesPredefinidas.map(l => ({
    nombre: l.nombre, latitud: l.latitud, longitud: l.longitud, alias: [l.nombre],
  })),
];

// Minúsculas, sin tildes ni signos, para comparar textos
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9#\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function buscarLocal(consulta: string): ResultadoGeocodificacion[] {
  const q = normalizar(consulta);
  if (q.length < 3) return [];
  const encontrados: { lugar: LugarConocido; puntaje: number }[] = [];
  for (const lugar of LUGARES_CONOCIDOS) {
    let mejor = Infinity;
    for (const alias of lugar.alias.map(normalizar)) {
      if (alias === q) mejor = Math.min(mejor, 0);
      else if (alias.startsWith(q)) mejor = Math.min(mejor, 1);
      else if (alias.includes(q) || q.includes(alias)) mejor = Math.min(mejor, 2);
    }
    if (mejor < Infinity) encontrados.push({ lugar, puntaje: mejor });
  }
  return encontrados
    .sort((a, b) => a.puntaje - b.puntaje)
    .slice(0, 4)
    .map(({ lugar }) => ({ nombreMostrado: `${lugar.nombre} · Bogotá`, latitud: lugar.latitud, longitud: lugar.longitud }));
}

// ── 2. Direcciones colombianas ────────────────────────────────
export interface DireccionColombiana {
  tipo: 'Calle' | 'Carrera' | 'Diagonal' | 'Transversal';
  avenida: boolean;
  numero: string;        // "72", "72A", "72 bis"
  cruce: string;         // "10", "10A"
  placa?: string;        // "34"
}

const TIPOS: Record<string, { tipo: DireccionColombiana['tipo']; avenida: boolean }> = {
  calle: { tipo: 'Calle', avenida: false }, cl: { tipo: 'Calle', avenida: false }, cll: { tipo: 'Calle', avenida: false },
  carrera: { tipo: 'Carrera', avenida: false }, cra: { tipo: 'Carrera', avenida: false }, cr: { tipo: 'Carrera', avenida: false },
  kr: { tipo: 'Carrera', avenida: false }, kra: { tipo: 'Carrera', avenida: false },
  diagonal: { tipo: 'Diagonal', avenida: false }, dg: { tipo: 'Diagonal', avenida: false }, diag: { tipo: 'Diagonal', avenida: false },
  transversal: { tipo: 'Transversal', avenida: false }, tv: { tipo: 'Transversal', avenida: false }, trans: { tipo: 'Transversal', avenida: false },
  'avenida calle': { tipo: 'Calle', avenida: true }, 'av calle': { tipo: 'Calle', avenida: true }, ac: { tipo: 'Calle', avenida: true },
  'avenida carrera': { tipo: 'Carrera', avenida: true }, 'av carrera': { tipo: 'Carrera', avenida: true }, ak: { tipo: 'Carrera', avenida: true },
  avenida: { tipo: 'Carrera', avenida: true }, av: { tipo: 'Carrera', avenida: true },
};

const TIPO_TEXTO = 'avenida calle|avenida carrera|av calle|av carrera|avenida|calle|carrera|diagonal|transversal|cll|cl|cra|cr|kra|kr|dg|diag|tv|trans|ak|ac|av';
const FIN_NUM = '(?![0-9a-z])';
// "Calle 72 # 10-34", "Cra 7 No 32-16", "Av Calle 26 # 69-76"
const PATRON_DIRECCION = new RegExp(
  `^(${TIPO_TEXTO}) ?(\\d{1,3}[a-z]?)${FIN_NUM}( bis)?( sur| este| norte)?` +
  ` ?(?:#|no|numero)? ?(\\d{1,3}[a-z]?)${FIN_NUM}( bis)?( sur| este)?` +
  ' ?-? ?(\\d{1,3})?'
);
// "Calle 80 con Carrera 30", "Calle 72 y carrera 10"
const PATRON_ESQUINA = new RegExp(
  `^(${TIPO_TEXTO}) ?(\\d{1,3}[a-z]?)${FIN_NUM}( bis)?( sur| este| norte)? (?:con|x|y|esquina|cruce con) (?:${TIPO_TEXTO}) ?(\\d{1,3}[a-z]?)${FIN_NUM}`
);

export function analizarDireccion(texto: string): DireccionColombiana | null {
  const limpio = normalizar(texto).replace(/ ?# ?/g, ' # ');
  const esquina = PATRON_ESQUINA.exec(limpio);
  const coincidencia = esquina ?? PATRON_DIRECCION.exec(limpio);
  if (!coincidencia) return null;
  const tipoTexto = coincidencia[1], numero = coincidencia[2];
  const base = TIPOS[tipoTexto];
  if (!base) return null;
  if (esquina) {
    return { tipo: base.tipo, avenida: base.avenida, numero: `${numero}${esquina[3] ?? ''}${esquina[4] ?? ''}`.trim(), cruce: esquina[5] };
  }
  const [, , , bis1, sufijo1, cruce, bis2, sufijo2, placa] = coincidencia;
  if (!cruce) return null;
  return {
    tipo: base.tipo,
    avenida: base.avenida,
    numero: `${numero}${bis1 ?? ''}${sufijo1 ?? ''}`.trim(),
    cruce: `${cruce}${bis2 ?? ''}${sufijo2 ?? ''}`.trim(),
    placa,
  };
}

// Nombres con los que OpenStreetMap conoce algunas vías principales
const ALIAS_VIAS: Record<string, string[]> = {
  'carrera 7': ['Carrera Séptima', 'Avenida Carrera 7'],
  'carrera 9': ['Avenida Carrera 9'],
  'carrera 14': ['Avenida Caracas'],
  'carrera 30': ['Avenida NQS', 'Avenida Carrera 30'],
  'carrera 45': ['Autopista Norte'],
  'carrera 68': ['Avenida Carrera 68'],
  'carrera 72': ['Avenida Boyacá'],
  'calle 13': ['Avenida Calle 13', 'Avenida Jiménez'],
  'calle 26': ['Avenida El Dorado', 'Avenida Calle 26'],
  'calle 80': ['Avenida Calle 80'],
  'calle 100': ['Avenida Calle 100'],
};

function variantesVia(tipo: string, numero: string, avenida: boolean): string[] {
  const base = `${tipo} ${numero}`;
  const lista = avenida ? [`Avenida ${base}`, base] : [base, `Avenida ${base}`];
  return [...lista, ...(ALIAS_VIAS[base.toLowerCase()] ?? [])];
}

function tipoDelCruce(tipo: DireccionColombiana['tipo']): string {
  return tipo === 'Calle' || tipo === 'Diagonal' ? 'Carrera' : 'Calle';
}

// ── Geometría: esquina entre dos vías ───────────────────────────
// Busca el par de puntos más cercano entre las dos vías (en OpenStreetMap las vías que se
// cruzan comparten un nodo, así que el punto más cercano es la esquina).
export function esquinaAproximada(viaA: Coordenada[], viaB: Coordenada[], maxKm = 0.35): Coordenada | null {
  let mejorDistancia = Infinity;
  let mejorA: Coordenada | null = null;
  let mejorB: Coordenada | null = null;
  const kmPorGradoLat = 110.57;
  const kmPorGradoLng = 111.32 * Math.cos(aRadianes(4.65));
  for (const a of viaA) {
    for (const b of viaB) {
      const dy = (a.latitud - b.latitud) * kmPorGradoLat;
      const dx = (a.longitud - b.longitud) * kmPorGradoLng;
      const d2 = dx * dx + dy * dy;
      if (d2 < mejorDistancia) { mejorDistancia = d2; mejorA = a; mejorB = b; }
    }
  }
  if (!mejorA || !mejorB || Math.sqrt(mejorDistancia) > maxKm) return null;
  return { latitud: (mejorA.latitud + mejorB.latitud) / 2, longitud: (mejorA.longitud + mejorB.longitud) / 2 };
}

// ── Consultas a internet ───────────────────────────────────────
const esperar = (ms: number) => new Promise(resolver => setTimeout(resolver, ms));

async function pedirJson(url: string, ms = 8000): Promise<any> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), ms);
  try {
    const respuesta = await fetch(url, { headers: { 'Accept-Language': 'es' }, signal: controlador.signal });
    if (!respuesta.ok) throw new Error(`Servicio de búsqueda no disponible (${respuesta.status})`);
    return await respuesta.json();
  } finally {
    clearTimeout(temporizador);
  }
}

// Extrae los puntos de una vía (LineString / MultiLineString) devuelta por Nominatim
function puntosDeGeometria(geojson: any): Coordenada[] {
  if (!geojson) return [];
  const aPuntos = (pares: number[][]) => pares.map(([lon, lat]) => ({ latitud: lat, longitud: lon }));
  if (geojson.type === 'LineString') return aPuntos(geojson.coordinates);
  if (geojson.type === 'MultiLineString') return geojson.coordinates.flatMap((l: number[][]) => aPuntos(l));
  if (geojson.type === 'Point') return aPuntos([geojson.coordinates]);
  return [];
}

async function puntosDeVia(nombres: string[]): Promise<Coordenada[]> {
  for (let i = 0; i < nombres.length; i++) {
    const parametros = new URLSearchParams({
      format: 'jsonv2', q: `${nombres[i]}, Bogotá`, limit: '40',
      viewbox: CAJA_BOGOTA, bounded: '1', countrycodes: 'co', polygon_geojson: '1',
    });
    const datos = (await pedirJson(`https://nominatim.openstreetmap.org/search?${parametros}`)) as any[];
    const puntos = datos.filter(d => d.category === 'highway' || d.class === 'highway')
      .flatMap(d => puntosDeGeometria(d.geojson));
    if (puntos.length) return puntos;
    await esperar(PAUSA_ENTRE_CONSULTAS_MS);
  }
  return [];
}

async function resolverDireccion(direccion: DireccionColombiana): Promise<ResultadoGeocodificacion[]> {
  const principal = await puntosDeVia(variantesVia(direccion.tipo, direccion.numero, direccion.avenida));
  if (!principal.length) return [];
  await esperar(PAUSA_ENTRE_CONSULTAS_MS);
  const cruce = await puntosDeVia(variantesVia(tipoDelCruce(direccion.tipo), direccion.cruce, false));
  const esquina = cruce.length ? esquinaAproximada(principal, cruce) : null;
  if (!esquina) return [];
  const placa = direccion.placa ? `-${direccion.placa}` : '';
  return [{
    nombreMostrado: `${direccion.avenida ? 'Av. ' : ''}${direccion.tipo} ${direccion.numero} # ${direccion.cruce}${placa} · Bogotá (ubicación aproximada)`,
    latitud: esquina.latitud,
    longitud: esquina.longitud,
  }];
}

async function buscarPhoton(consulta: string): Promise<ResultadoGeocodificacion[]> {
  const parametros = new URLSearchParams({ q: consulta, limit: '6', lat: '4.65', lon: '-74.08', bbox: CAJA_BOGOTA });
  const datos = await pedirJson(`https://photon.komoot.io/api/?${parametros}`);
  return (datos.features as any[]).map(f => {
    const p = f.properties ?? {};
    const calle = [p.street, p.housenumber].filter(Boolean).join(' ');
    const nombre = [p.name ?? calle, p.name ? calle : '', p.district ?? p.locality, p.city].filter(Boolean).join(', ');
    return { nombreMostrado: nombre || consulta, latitud: f.geometry.coordinates[1], longitud: f.geometry.coordinates[0] };
  });
}

async function buscarNominatim(consulta: string): Promise<ResultadoGeocodificacion[]> {
  const conCiudad = normalizar(consulta).includes('bogota') ? consulta : `${consulta}, Bogotá`;
  const parametros = new URLSearchParams({
    format: 'json', q: conCiudad, limit: '5', viewbox: CAJA_BOGOTA, bounded: '0', countrycodes: 'co',
  });
  const datos = (await pedirJson(`https://nominatim.openstreetmap.org/search?${parametros}`)) as any[];
  return datos.map(item => ({
    nombreMostrado: item.display_name as string,
    latitud: parseFloat(item.lat),
    longitud: parseFloat(item.lon),
  }));
}

// Quita resultados repetidos (a menos de 80 m uno del otro)
function sinRepetidos(lista: ResultadoGeocodificacion[]): ResultadoGeocodificacion[] {
  const salida: ResultadoGeocodificacion[] = [];
  for (const r of lista) {
    if (!salida.some(s => distanciaHaversineKm({ latitud: s.latitud, longitud: s.longitud }, { latitud: r.latitud, longitud: r.longitud }) < 0.08)) salida.push(r);
  }
  return salida;
}

export async function buscarLugar(consulta: string): Promise<ResultadoGeocodificacion[]> {
  const texto = consulta.trim();
  if (texto.length < 3) return [];

  const locales = buscarLocal(texto);
  const direccion = analizarDireccion(texto);
  let remotos: ResultadoGeocodificacion[] = [];
  let falloRed = false;

  if (direccion) {
    try { remotos = await resolverDireccion(direccion); } catch { falloRed = true; }
    if (remotos.length) return sinRepetidos([...remotos, ...locales]);
  }

  const respuestas = await Promise.allSettled([buscarPhoton(texto), buscarNominatim(texto)]);
  for (const r of respuestas) {
    if (r.status === 'fulfilled') remotos.push(...r.value);
  }
  if (respuestas.every(r => r.status === 'rejected')) falloRed = true;

  const todos = sinRepetidos([...locales, ...remotos]);
  if (!todos.length && falloRed) throw new Error('No se pudo conectar con el servicio de búsqueda de lugares');
  return todos;
}