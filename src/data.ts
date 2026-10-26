import { RutaCiclista, MarcadorMapa } from './types';

export const rutasCiclistas: RutaCiclista[] = [
  {
    id: 'route-1',
    nombre: 'Ruta Ciclovía Séptima',
    descripcion: 'Ruta segura por la ciclovía de la Séptima, ideal para principiantes y familias.',
    coordenadas: [
      { latitud: 4.6533, longitud: -74.0575 },
      { latitud: 4.6589, longitud: -74.0580 },
      { latitud: 4.6650, longitud: -74.0585 },
      { latitud: 4.6710, longitud: -74.0590 },
    ],
    nivelSeguridad: 'segura',
    distancia: 2.1,
    caracteristicas: ['Ciclovía exclusiva', 'Iluminación', 'Señalización'],
    calificaciones: [5, 4, 5, 4, 5],
    resenas: [
      {
        calificacion: 5,
        comentario: 'Perfecta para salidas familiares, muy bien señalizada.',
        impresiones: ['Muy segura', 'Bien señalizada', 'Paisaje bonito'],
        creadoEn: '2026-03-01T10:00:00Z',
      },
    ],
  },
  {
    id: 'route-2',
    nombre: 'Ruta Parque Simón Bolívar',
    descripcion: 'Circuito recreativo alrededor del parque, sin tráfico motorizado.',
    coordenadas: [
      { latitud: 4.6570, longitud: -74.0920 },
      { latitud: 4.6590, longitud: -74.0950 },
      { latitud: 4.6610, longitud: -74.0940 },
      { latitud: 4.6600, longitud: -74.0910 },
      { latitud: 4.6570, longitud: -74.0920 },
    ],
    nivelSeguridad: 'segura',
    distancia: 1.5,
    caracteristicas: ['Zona verde', 'Baja velocidad', 'Parqueaderos'],
    calificaciones: [5, 5, 4],
    resenas: [],
  },
  {
    id: 'route-3',
    nombre: 'Ruta Avenida Caracas',
    descripcion: 'Ruta moderada con carril compartido y tráfico vehicular frecuente.',
    coordenadas: [
      { latitud: 4.6350, longitud: -74.0650 },
      { latitud: 4.6420, longitud: -74.0655 },
      { latitud: 4.6490, longitud: -74.0660 },
      { latitud: 4.6560, longitud: -74.0665 },
    ],
    nivelSeguridad: 'moderada',
    distancia: 2.8,
    caracteristicas: ['Carril compartido', 'Alto tráfico', 'Comercial'],
    calificaciones: [3, 3, 2],
    resenas: [],
  },
  {
    id: 'route-4',
    nombre: 'Ruta Autopista Norte',
    descripcion: '⚠️ Tráfico pesado — no recomendada para principiantes.',
    coordenadas: [
      { latitud: 4.6800, longitud: -74.0500 },
      { latitud: 4.6900, longitud: -74.0490 },
      { latitud: 4.7000, longitud: -74.0480 },
    ],
    nivelSeguridad: 'peligrosa',
    distancia: 2.3,
    caracteristicas: ['Sin ciclovía', 'Tráfico pesado', 'Alta velocidad'],
    calificaciones: [1, 2],
    resenas: [],
  },
  {
    id: 'route-5',
    nombre: 'Ruta Zona Industrial',
    descripcion: '⚠️ Zona de alto riesgo — camiones de carga y mal pavimento.',
    coordenadas: [
      { latitud: 4.6200, longitud: -74.1100 },
      { latitud: 4.6250, longitud: -74.1150 },
      { latitud: 4.6300, longitud: -74.1200 },
    ],
    nivelSeguridad: 'peligrosa',
    distancia: 1.8,
    caracteristicas: ['Zona industrial', 'Vehículos pesados', 'Mal pavimento'],
    calificaciones: [1],
    resenas: [],
  },
];

export const marcadoresMapa: MarcadorMapa[] = [
  {
    id: 'marker-1',
    posicion: { latitud: 4.6533, longitud: -74.0575 },
    titulo: 'Parqueadero de Bicicletas — Centro',
    tipo: 'parqueadero',
  },
  {
    id: 'marker-2',
    posicion: { latitud: 4.6570, longitud: -74.0920 },
    titulo: 'Taller de Reparación',
    tipo: 'taller',
  },
  {
    id: 'marker-3',
    posicion: { latitud: 4.6800, longitud: -74.0500 },
    titulo: '⚠️ Zona Peligrosa — Alto tráfico',
    tipo: 'peligro',
  },
  {
    id: 'marker-4',
    posicion: { latitud: 4.6600, longitud: -74.0910 },
    titulo: 'Parque Simón Bolívar',
    tipo: 'interes',
  },
];

// ── Ubicaciones predefinidas para el planificador de rutas ───────────────────────
export const ubicacionesPredefinidas = [
  { nombre: 'Plaza de Bolívar',    latitud: 4.5981, longitud: -74.0758 },
  { nombre: 'Parque 93',           latitud: 4.6764, longitud: -74.0469 },
  { nombre: 'Unicentro',           latitud: 4.7018, longitud: -74.0441 },
  { nombre: 'Aeropuerto El Dorado',latitud: 4.7016, longitud: -74.1469 },
  { nombre: 'Usaquén',             latitud: 4.6951, longitud: -74.0301 },
  { nombre: 'Centro Andino',       latitud: 4.6658, longitud: -74.0546 },
  { nombre: 'Chapinero',           latitud: 4.6448, longitud: -74.0654 },
  { nombre: 'Suba',                latitud: 4.7440, longitud: -74.0830 },
];
