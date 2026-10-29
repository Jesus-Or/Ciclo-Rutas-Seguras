import { RutaCiclista, MarcadorMapa, Coordenada, NivelSeguridad, ResenaRuta } from './types';
import { distanciaHaversineKm } from './utils';

// ═══════════════════════════════════════════════════════════════════
//  DATOS DE EJEMPLO
//  Los trazados son aproximados (error posible de unos cientos de metros).
//  Para producción deben reemplazarse por datos reales (IDU, comunidad, etc.).
//  Las descripciones de riesgo (hurtos, tráfico, iluminación) son ilustrativas: deben
//  validarse con datos oficiales (Policía, Secretaría de Seguridad, IDU) antes de publicarse.
//  Para agregar una ruta basta con añadir un `crearRuta({...})` al arreglo.
// ═══════════════════════════════════════════════════════════════════

type Punto = [number, number]; // [latitud, longitud]

function aCoordenadas(puntos: Punto[]): Coordenada[] {
  return puntos.map(([latitud, longitud]) => ({ latitud, longitud }));
}

// Longitud del trazado en km (suma de los tramos), redondeada a 1 decimal
function longitudKm(coordenadas: Coordenada[]): number {
  let total = 0;
  for (let i = 1; i < coordenadas.length; i++) {
    total += distanciaHaversineKm(coordenadas[i - 1], coordenadas[i]);
  }
  return Math.round(total * 10) / 10;
}

function crearRuta(datos: {
  id: string;
  nombre: string;
  descripcion: string;
  nivelSeguridad: NivelSeguridad;
  puntos: Punto[];
  caracteristicas: string[];
  calificaciones: number[];
  resenas?: ResenaRuta[];
}): RutaCiclista {
  const coordenadas = aCoordenadas(datos.puntos);
  return {
    id: datos.id,
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    coordenadas,
    nivelSeguridad: datos.nivelSeguridad,
    distancia: longitudKm(coordenadas),
    caracteristicas: datos.caracteristicas,
    calificaciones: datos.calificaciones,
    resenas: datos.resenas ?? [],
  };
}

export const rutasCiclistas: RutaCiclista[] = [
  // ───────────────────────── SEGURAS ─────────────────────────────
  crearRuta({
    id: 'ruta-1',
    nombre: 'Ruta Ciclovía Séptima',
    descripcion: 'Ciclovía exclusiva con buena iluminación y señalización. Riesgo bajo: el principal cuidado es el hurto de celulares en horas de poca afluencia y el cruce de peatones los fines de semana.',
    nivelSeguridad: 'segura',
    puntos: [[4.6533, -74.0575], [4.6589, -74.0580], [4.6650, -74.0585], [4.6710, -74.0590]],
    caracteristicas: ['Ciclovía exclusiva', 'Iluminación', 'Señalización', 'Hurto bajo en horas pico'],
    calificaciones: [5, 4, 5, 4, 5],
    resenas: [{
      calificacion: 5,
      comentario: 'Perfecta para salidas familiares, muy bien señalizada.',
      impresiones: ['Muy segura', 'Bien señalizada', 'Paisaje bonito'],
      creadoEn: '2026-03-01T10:00:00Z',
    }],
  }),
  crearRuta({
    id: 'ruta-2',
    nombre: 'Ruta Parque Simón Bolívar',
    descripcion: 'Circuito dentro del parque, sin tráfico motorizado. Riesgo bajo: evita recorrerlo solo de noche, cuando hay menos gente y aumenta el riesgo de hurto, y cuida la velocidad por los peatones.',
    nivelSeguridad: 'segura',
    puntos: [[4.6570, -74.0920], [4.6590, -74.0950], [4.6610, -74.0940], [4.6600, -74.0910], [4.6570, -74.0920]],
    caracteristicas: ['Zona verde', 'Sin tráfico motorizado', 'Parqueaderos', 'Poca gente de noche'],
    calificaciones: [5, 5, 4],
  }),
  crearRuta({
    id: 'ruta-6',
    nombre: 'Ciclorruta Calle 26 (El Dorado)',
    descripcion: 'Ciclorruta separada del tráfico de la Av. El Dorado, bien señalizada. Riesgo bajo a moderado: hay cruces con salidas de vehículos y en tramos solitarios se reportan hurtos de bicicletas y celulares al caer la tarde.',
    nivelSeguridad: 'segura',
    puntos: [[4.6125, -74.0745], [4.6200, -74.0840], [4.6290, -74.0940], [4.6380, -74.1010], [4.6470, -74.1080], [4.6600, -74.1190]],
    caracteristicas: ['Ciclorruta separada', 'Iluminación', 'Señalización', 'Cruces con salidas de vehículos'],
    calificaciones: [5, 4, 4, 5],
  }),
  crearRuta({
    id: 'ruta-7',
    nombre: 'Ciclorruta Parque El Virrey – Parque 93',
    descripcion: 'Recorrido entre parques con ciclorruta exclusiva y zonas comerciales cerca. Riesgo bajo: vigilancia frecuente, pero no dejes la bicicleta sin candado y cuida el celular al detenerte.',
    nivelSeguridad: 'segura',
    puntos: [[4.6705, -74.0570], [4.6718, -74.0550], [4.6745, -74.0520], [4.6764, -74.0475], [4.6785, -74.0440]],
    caracteristicas: ['Zona verde', 'Ciclorruta exclusiva', 'Zona comercial cerca', 'Vigilancia frecuente'],
    calificaciones: [5, 5, 4, 5],
  }),
  crearRuta({
    id: 'ruta-8',
    nombre: 'Ciclorruta Usaquén – Carrera Séptima norte',
    descripcion: 'Tramo turístico hacia Usaquén, bien iluminado y con poco tráfico. Riesgo bajo: los fines de semana hay mucho peatón y de noche conviene ir acompañado por posibles hurtos al salir de bares y restaurantes.',
    nivelSeguridad: 'segura',
    puntos: [[4.6840, -74.0440], [4.6900, -74.0390], [4.6951, -74.0330], [4.7010, -74.0300], [4.7080, -74.0290]],
    caracteristicas: ['Iluminación', 'Baja velocidad', 'Zona turística', 'Mucho peatón los fines de semana'],
    calificaciones: [5, 4, 5],
  }),
  crearRuta({
    id: 'ruta-9',
    nombre: 'Ciclorruta Humedal Córdoba – Av. Suba',
    descripcion: 'Ciclorruta junto al humedal con vegetación y flujo constante de ciclistas. Riesgo bajo de día; en tramos con poca iluminación y vegetación alta puede haber hurtos, así que evítala de noche.',
    nivelSeguridad: 'segura',
    puntos: [[4.7010, -74.0690], [4.7040, -74.0720], [4.7060, -74.0780], [4.7090, -74.0830], [4.7120, -74.0880]],
    caracteristicas: ['Zona verde', 'Ciclorruta separada', 'Mucho flujo de ciclistas', 'Tramos oscuros de noche'],
    calificaciones: [4, 5, 4],
  }),
  crearRuta({
    id: 'ruta-10',
    nombre: 'Ciclorruta Parque El Tunal',
    descripcion: 'Circuito del parque metropolitano sin tráfico motorizado. Riesgo bajo de día; de noche y en zonas apartadas del parque se reporta riesgo de hurto, y hay peatones y niños en el recorrido.',
    nivelSeguridad: 'segura',
    puntos: [[4.5700, -74.1330], [4.5730, -74.1290], [4.5760, -74.1260], [4.5790, -74.1300], [4.5750, -74.1350], [4.5700, -74.1330]],
    caracteristicas: ['Zona verde', 'Sin tráfico motorizado', 'Parqueaderos', 'Zonas apartadas de noche'],
    calificaciones: [5, 4, 4],
  }),
  crearRuta({
    id: 'ruta-11',
    nombre: 'Ciclorruta Parque Nacional – Universidad Nacional',
    descripcion: 'Conecta zonas universitarias y de parque con ciclorruta señalizada. Riesgo bajo a moderado: mucho flujo de estudiantes, y se reportan hurtos de celulares y bicicletas en los alrededores al anochecer.',
    nivelSeguridad: 'segura',
    puntos: [[4.6240, -74.0660], [4.6310, -74.0700], [4.6360, -74.0780], [4.6385, -74.0835]],
    caracteristicas: ['Ciclorruta señalizada', 'Zona universitaria', 'Biciparqueaderos', 'Hurto de bicicletas al anochecer'],
    calificaciones: [4, 5, 4, 4],
  }),

  // ──────────────────────── MODERADAS ────────────────────────────
  crearRuta({
    id: 'ruta-3',
    nombre: 'Ruta Avenida Caracas',
    descripcion: 'Carril compartido con buses y carros sobre una avenida comercial. Riesgo moderado: tráfico frecuente, buses que invaden el carril y hurtos de celulares en semáforos y paraderos. Usa luces y mantente alerta.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6350, -74.0650], [4.6420, -74.0655], [4.6490, -74.0660], [4.6560, -74.0665]],
    caracteristicas: ['Carril compartido', 'Alto tráfico', 'Comercial', 'Hurto en semáforos y paraderos'],
    calificaciones: [3, 3, 2],
  }),
  crearRuta({
    id: 'ruta-12',
    nombre: 'Ciclorruta Calle 80',
    descripcion: 'Ciclorruta interrumpida por cruces vehiculares y carriles de buses. Riesgo moderado: giros de vehículos sin ver al ciclista, tráfico de buses y hurtos en puentes y tramos con poca gente.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6700, -74.0590], [4.6760, -74.0720], [4.6820, -74.0850], [4.6880, -74.0960], [4.6960, -74.1050], [4.7040, -74.1120]],
    caracteristicas: ['Cruces frecuentes', 'Tráfico de buses', 'Ciclorruta parcial', 'Hurto en puentes peatonales'],
    calificaciones: [3, 4, 3, 3],
  }),
  crearRuta({
    id: 'ruta-13',
    nombre: 'Ciclorruta Av. Boyacá (Calle 26 – Calle 80)',
    descripcion: 'Ciclorruta junto a una avenida de alto flujo con muchas intersecciones. Riesgo moderado: vehículos rápidos, cruces sin protección y tramos solitarios donde se han reportado hurtos.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6560, -74.1080], [4.6650, -74.1075], [4.6750, -74.1070], [4.6850, -74.1065], [4.6950, -74.1060]],
    caracteristicas: ['Avenida de alto flujo', 'Ciclorruta parcial', 'Intersecciones', 'Tramos solitarios'],
    calificaciones: [3, 3, 4],
  }),
  crearRuta({
    id: 'ruta-14',
    nombre: 'Ciclorruta Calle 13 (Centro – Carrera 50)',
    descripcion: 'Carril bici en zona de comercio con camiones de carga y vehículos parqueados en el carril. Riesgo moderado: se reportan hurtos de celulares y bicicletas, y hay obstáculos y peatones que cruzan sin mirar.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6010, -74.0800], [4.6060, -74.0870], [4.6110, -74.0950]],
    caracteristicas: ['Carril bici', 'Comercio', 'Vehículos de carga', 'Hurto de celulares y bicicletas'],
    calificaciones: [3, 2, 3],
  }),
  crearRuta({
    id: 'ruta-15',
    nombre: 'Ciclorruta Av. Las Américas',
    descripcion: 'Carril bici intermitente con buses y camiones a alta velocidad. Riesgo moderado: el carril desaparece en varios tramos y te obliga a compartir la vía con tráfico pesado; hay zonas con riesgo de hurto.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6000, -74.0930], [4.6070, -74.1060], [4.6130, -74.1180], [4.6180, -74.1320], [4.6230, -74.1460]],
    caracteristicas: ['Carril intermitente', 'Tráfico de buses', 'Camiones', 'Hurto en zonas de poca vigilancia'],
    calificaciones: [3, 3, 2, 3],
  }),
  crearRuta({
    id: 'ruta-16',
    nombre: 'Ciclorruta Av. Carrera 68',
    descripcion: 'Eje norte-sur con ciclorruta y cruces concurridos. Riesgo moderado: giros de vehículos, tráfico medio a pesado en horas pico y hurtos en intersecciones y puentes.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6180, -74.1130], [4.6330, -74.1090], [4.6500, -74.1040], [4.6650, -74.0990], [4.6800, -74.0960]],
    caracteristicas: ['Ciclorruta', 'Cruces concurridos', 'Tráfico medio a pesado', 'Hurto en intersecciones'],
    calificaciones: [3, 4, 3],
  }),
  crearRuta({
    id: 'ruta-17',
    nombre: 'Ciclorruta NQS (Carrera 30)',
    descripcion: 'Acompaña una vía con buses articulados y cruces peatonales cerca de zonas universitarias. Riesgo moderado: mucho peatón, buses en carril contiguo y hurtos de celulares al detenerte.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6020, -74.0920], [4.6150, -74.0870], [4.6300, -74.0840], [4.6460, -74.0810], [4.6600, -74.0790], [4.6720, -74.0770]],
    caracteristicas: ['Zona universitaria', 'Buses articulados', 'Cruces peatonales', 'Hurto de celulares'],
    calificaciones: [3, 3, 4, 3],
  }),
  crearRuta({
    id: 'ruta-18',
    nombre: 'Ciclorruta Calle 100',
    descripcion: 'Eje de oficinas con ciclorruta y tráfico fuerte en horas pico. Riesgo moderado: vehículos rápidos, giros y poca gente en la noche, cuando aumenta el riesgo de hurto.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6860, -74.0420], [4.6870, -74.0520], [4.6880, -74.0620], [4.6890, -74.0720], [4.6900, -74.0830]],
    caracteristicas: ['Zona de oficinas', 'Tráfico en hora pico', 'Ciclorruta parcial', 'Poca gente de noche'],
    calificaciones: [3, 4, 3],
  }),
  crearRuta({
    id: 'ruta-19',
    nombre: 'Ciclorruta Av. Ciudad de Cali',
    descripcion: 'Avenida amplia con ciclorruta parcial y tramos sin iluminación. Riesgo moderado a alto: vehículos a velocidad, poca visibilidad nocturna y hurtos en sectores solitarios.',
    nivelSeguridad: 'moderada',
    puntos: [[4.6700, -74.1190], [4.6850, -74.1180], [4.7000, -74.1170]],
    caracteristicas: ['Avenida amplia', 'Iluminación irregular', 'Ciclorruta parcial', 'Sectores solitarios'],
    calificaciones: [3, 3, 2],
  }),

  // ──────────────────────── PELIGROSAS ───────────────────────────
  crearRuta({
    id: 'ruta-4',
    nombre: 'Ruta Autopista Norte',
    descripcion: '⚠️ Vía rápida de tráfico pesado sin ciclovía. Riesgo alto: carros y buses a alta velocidad, sin espacio seguro para el ciclista, y riesgo de hurto y de atropellos. No recomendada para principiantes ni de noche.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.6800, -74.0500], [4.6900, -74.0490], [4.7000, -74.0480]],
    caracteristicas: ['Sin ciclovía', 'Tráfico pesado', 'Alta velocidad', 'Riesgo de atropello'],
    calificaciones: [1, 2],
  }),
  crearRuta({
    id: 'ruta-5',
    nombre: 'Ruta Zona Industrial',
    descripcion: '⚠️ Zona industrial de alto riesgo: camiones de carga, mal pavimento y huecos. Riesgo alto de accidentes y de hurto, sobre todo de noche, por poca presencia de gente y vigilancia.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.6200, -74.1100], [4.6250, -74.1150], [4.6300, -74.1200]],
    caracteristicas: ['Zona industrial', 'Vehículos pesados', 'Mal pavimento', 'Hurto y poca vigilancia'],
    calificaciones: [1],
  }),
  crearRuta({
    id: 'ruta-20',
    nombre: 'Ruta Autopista Sur',
    descripcion: '⚠️ Vía de salida de la ciudad sin ciclovía, con tráfico pesado y poca visibilidad nocturna. Riesgo alto: camiones y buses rápidos, sin berma y con hurtos reportados en sectores solitarios.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.5890, -74.1120], [4.5850, -74.1350], [4.5820, -74.1580], [4.5800, -74.1820], [4.5790, -74.2050]],
    caracteristicas: ['Sin ciclovía', 'Tráfico pesado', 'Alta velocidad', 'Poca visibilidad nocturna'],
    calificaciones: [1, 1, 2],
  }),
  crearRuta({
    id: 'ruta-21',
    nombre: 'Ruta Av. Boyacá sur',
    descripcion: '⚠️ Tramo sin ciclovía con buses y camiones a alta velocidad. Riesgo alto: no hay espacio seguro, hay cruces peligrosos y zonas con riesgo de hurto y de choques.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.6290, -74.1150], [4.6150, -74.1160], [4.6000, -74.1190], [4.5900, -74.1230], [4.5800, -74.1330]],
    caracteristicas: ['Sin ciclovía', 'Camiones', 'Alta velocidad', 'Cruces peligrosos'],
    calificaciones: [2, 1, 2],
  }),
  crearRuta({
    id: 'ruta-22',
    nombre: 'Ruta Av. Primero de Mayo',
    descripcion: '⚠️ Vía de carga con huecos, poco espacio para ciclistas y mucho tráfico pesado. Riesgo alto de caída por el pavimento y de hurto en tramos poco vigilados.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.5930, -74.0980], [4.5920, -74.1100], [4.5900, -74.1220], [4.5880, -74.1350]],
    caracteristicas: ['Vehículos de carga', 'Mal pavimento', 'Sin ciclovía', 'Hurto en tramos poco vigilados'],
    calificaciones: [1, 2],
  }),
  crearRuta({
    id: 'ruta-23',
    nombre: 'Ruta Av. Medellín (Calle 80 occidente)',
    descripcion: '⚠️ Vía de alta velocidad hacia la salida a occidente, sin carril para bicicletas ni buena iluminación. Riesgo alto: velocidad, poca visibilidad nocturna y hurtos en tramos solitarios.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.7040, -74.1120], [4.7110, -74.1250], [4.7180, -74.1400], [4.7250, -74.1550]],
    caracteristicas: ['Sin ciclovía', 'Alta velocidad', 'Poca iluminación', 'Tramos solitarios'],
    calificaciones: [1, 1, 2],
  }),
  crearRuta({
    id: 'ruta-24',
    nombre: 'Ruta Autopista Norte – Calle 170',
    descripcion: '⚠️ Continuación de una autopista con tráfico intermunicipal y sin espacio para bicicletas. Riesgo alto: vehículos muy rápidos, sin berma y con poca presencia de gente.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.7000, -74.0480], [4.7150, -74.0460], [4.7300, -74.0440], [4.7450, -74.0430]],
    caracteristicas: ['Sin ciclovía', 'Tráfico intermunicipal', 'Alta velocidad', 'Sin berma'],
    calificaciones: [1, 2, 1],
  }),
  crearRuta({
    id: 'ruta-25',
    nombre: 'Ruta Av. Ciudad de Cali norte',
    descripcion: '⚠️ Tramo largo sin ciclorruta ni iluminación adecuada, con camiones frecuentes. Riesgo alto de atropello y de hurto de noche en sectores solos.',
    nivelSeguridad: 'peligrosa',
    puntos: [[4.7150, -74.1160], [4.7300, -74.1150], [4.7450, -74.1140]],
    caracteristicas: ['Sin ciclorruta', 'Poca iluminación', 'Camiones', 'Hurto de noche'],
    calificaciones: [2, 1],
  }),
];

export const marcadoresMapa: MarcadorMapa[] = [
  // ── Biciparqueaderos ──
  { id: 'marcador-1',  posicion: { latitud: 4.6533, longitud: -74.0575 }, titulo: 'Parqueadero de Bicicletas — Centro',        tipo: 'parqueadero' },
  { id: 'marcador-5',  posicion: { latitud: 4.6370, longitud: -74.0830 }, titulo: 'Biciparqueadero Universidad Nacional',      tipo: 'parqueadero' },
  { id: 'marcador-6',  posicion: { latitud: 4.6764, longitud: -74.0475 }, titulo: 'Biciparqueadero Parque de la 93',           tipo: 'parqueadero' },
  { id: 'marcador-7',  posicion: { latitud: 4.7110, longitud: -74.1130 }, titulo: 'Biciparqueadero Portal 80',                 tipo: 'parqueadero' },
  { id: 'marcador-8',  posicion: { latitud: 4.5745, longitud: -74.1330 }, titulo: 'Biciparqueadero Parque El Tunal',           tipo: 'parqueadero' },
  { id: 'marcador-9',  posicion: { latitud: 4.7540, longitud: -74.0470 }, titulo: 'Biciparqueadero Portal Norte',              tipo: 'parqueadero' },
  // ── Talleres ──
  { id: 'marcador-2',  posicion: { latitud: 4.6570, longitud: -74.0920 }, titulo: 'Taller de Reparación',                      tipo: 'taller' },
  { id: 'marcador-10', posicion: { latitud: 4.6450, longitud: -74.0640 }, titulo: 'Taller de Bicicletas — Chapinero',          tipo: 'taller' },
  { id: 'marcador-11', posicion: { latitud: 4.6970, longitud: -74.0310 }, titulo: 'Taller de Bicicletas — Usaquén',            tipo: 'taller' },
  { id: 'marcador-12', posicion: { latitud: 4.6250, longitud: -74.1450 }, titulo: 'Taller de Bicicletas — Kennedy',            tipo: 'taller' },
  // ── Puntos de interés ──
  { id: 'marcador-4',  posicion: { latitud: 4.6600, longitud: -74.0910 }, titulo: 'Parque Simón Bolívar',                      tipo: 'interes' },
  { id: 'marcador-13', posicion: { latitud: 4.5981, longitud: -74.0758 }, titulo: 'Plaza de Bolívar',                          tipo: 'interes' },
  { id: 'marcador-14', posicion: { latitud: 4.6240, longitud: -74.0660 }, titulo: 'Parque Nacional',                           tipo: 'interes' },
  { id: 'marcador-15', posicion: { latitud: 4.6718, longitud: -74.0552 }, titulo: 'Parque El Virrey',                          tipo: 'interes' },
  { id: 'marcador-16', posicion: { latitud: 4.5710, longitud: -74.1330 }, titulo: 'Parque Metropolitano El Tunal',             tipo: 'interes' },
  // ── Puntos de riesgo (alimentan el cálculo de seguridad) ──
  { id: 'marcador-3',  posicion: { latitud: 4.6800, longitud: -74.0500 }, titulo: '⚠️ Zona Peligrosa — Alto tráfico',          tipo: 'peligro' },
  { id: 'marcador-17', posicion: { latitud: 4.6290, longitud: -74.1150 }, titulo: '⚠️ Cruce Av. Boyacá con Calle 13 (camiones)', tipo: 'peligro' },
  { id: 'marcador-18', posicion: { latitud: 4.6250, longitud: -74.1120 }, titulo: '⚠️ Zona de camiones — Puente Aranda',       tipo: 'peligro' },
  { id: 'marcador-19', posicion: { latitud: 4.5850, longitud: -74.1350 }, titulo: '⚠️ Puente sin ciclovía — Autopista Sur',    tipo: 'peligro' },
  { id: 'marcador-20', posicion: { latitud: 4.6350, longitud: -74.0650 }, titulo: '⚠️ Cruce peligroso — Caracas con Calle 45', tipo: 'peligro' },
  { id: 'marcador-21', posicion: { latitud: 4.7110, longitud: -74.1250 }, titulo: '⚠️ Sin iluminación — Av. Medellín',         tipo: 'peligro' },
  { id: 'marcador-22', posicion: { latitud: 4.6950, longitud: -74.1060 }, titulo: '⚠️ Intersección Av. Boyacá con Calle 80',   tipo: 'peligro' },
  { id: 'marcador-23', posicion: { latitud: 4.6880, longitud: -74.0830 }, titulo: '⚠️ Cruce Calle 100 con Av. 68 (alto flujo)', tipo: 'peligro' },
];

// ── Ubicaciones predefinidas para el planificador de rutas ───────────
export const ubicacionesPredefinidas = [
  { nombre: 'Plaza de Bolívar',        latitud: 4.5981, longitud: -74.0758 },
  { nombre: 'Museo del Oro',           latitud: 4.6016, longitud: -74.0720 },
  { nombre: 'Parque Nacional',         latitud: 4.6240, longitud: -74.0660 },
  { nombre: 'Universidad Nacional',    latitud: 4.6380, longitud: -74.0830 },
  { nombre: 'Estadio El Campín',       latitud: 4.6460, longitud: -74.0780 },
  { nombre: 'Chapinero',               latitud: 4.6448, longitud: -74.0654 },
  { nombre: 'Centro Andino',           latitud: 4.6658, longitud: -74.0546 },
  { nombre: 'Zona T',                  latitud: 4.6670, longitud: -74.0550 },
  { nombre: 'Parque 93',               latitud: 4.6764, longitud: -74.0469 },
  { nombre: 'Usaquén',                 latitud: 4.6951, longitud: -74.0301 },
  { nombre: 'Unicentro',               latitud: 4.7018, longitud: -74.0441 },
  { nombre: 'Parque Simón Bolívar',    latitud: 4.6580, longitud: -74.0930 },
  { nombre: 'Aeropuerto El Dorado',    latitud: 4.7016, longitud: -74.1469 },
  { nombre: 'Portal 80',               latitud: 4.7110, longitud: -74.1130 },
  { nombre: 'Portal Norte',            latitud: 4.7540, longitud: -74.0470 },
  { nombre: 'Suba',                    latitud: 4.7440, longitud: -74.0830 },
  { nombre: 'Plaza de las Américas',   latitud: 4.6170, longitud: -74.1360 },
  { nombre: 'Parque El Tunal',         latitud: 4.5710, longitud: -74.1330 },
];