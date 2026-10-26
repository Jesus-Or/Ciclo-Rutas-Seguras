// ── Tipos geográficos básicos ──────────────────────────────────────
export interface Coordenada {
  latitud: number;
  longitud: number;
}

export type NivelSeguridad = 'segura' | 'moderada' | 'peligrosa';

// ── Ruta ──────────────────────────────────────────────────────
export interface ResenaRuta {
  calificacion: number;           // de 1 a 5
  comentario?: string;
  impresiones: string[];
  creadoEn: string;        // fecha en formato ISO
}

export interface RutaCiclista {
  id: string;
  nombre: string;
  descripcion: string;
  coordenadas: Coordenada[];
  nivelSeguridad: NivelSeguridad;
  distancia: number;         // kilómetros
  caracteristicas: string[];
  calificaciones: number[];        // valores individuales de estrellas
  resenas: ResenaRuta[];
}

// ── Marcadores del mapa ───────────────────────────────────────────────
export interface MarcadorMapa {
  id: string;
  posicion: Coordenada;
  titulo: string;
  tipo: 'parqueadero' | 'taller' | 'peligro' | 'interes' | 'incidente';
}

// ── Planificación de ruta ────────────────────────────────────────────
export interface PuntoRuta {
  posicion: Coordenada;
  direccion?: string;
  tipo: 'inicio' | 'destino';
}

// ── Incidentes ─────────────────────────────────────────────────
export type TipoIncidente =
  | 'Accidente'
  | 'Hueco / Obstáculo'
  | 'Robo / Inseguridad'
  | 'Tráfico peligroso'
  | 'Carril bloqueado'
  | 'Mala iluminación'
  | 'Lluvia / Vía mojada'
  | 'Otro';

export interface ReporteIncidente {
  id: string;
  idRuta?: string;
  tipo: TipoIncidente;
  ubicacion: string;
  descripcion: string;
  posicion?: Coordenada;
  creadoEn: string;
}

// ── Suscripción ──────────────────────────────────────────────
export type TipoPlan = 'prueba' | 'mensual' | 'anual';

export interface CuentaUsuario {
  nombre: string;
  correo?: string;
  plan: TipoPlan;
  diasPruebaRestantes: number;    // solo aplica cuando plan === 'prueba'
  esPremium: boolean;
}

// ── Estado de la interfaz ──────────────────────────────────────────────
export type PestanaLateral = 'planificar' | 'rutas' | 'guardadas' | 'estadisticas';
export type ModoClic  = 'inicio' | 'destino' | null;
