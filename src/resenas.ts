import { supabase } from './supabase';

export interface ResenaDB {
  ruta_id: string;
  calificacion: number;
  impresiones: string[] | null;
  comentario: string | null;
  creado_en: string;
}

export interface NuevaResena {
  ruta_id: string;
  ruta_nombre: string;
  es_personalizada: boolean;
  calificacion: number;
  impresiones: string[];
  comentario: string;
  tiempo_segundos: number;
  distancia_km: number | null;
  nivel_seguridad: string | null;
  inicio_lat: number | null;
  inicio_lon: number | null;
  destino_lat: number | null;
  destino_lon: number | null;
  destino_nombre: string | null;
}

/** Guarda una reseña. Devuelve null si salió bien, o el mensaje de error. */
export async function guardarResena(datos: NuevaResena): Promise<string | null> {
  if (!supabase) return 'Sin conexión con la base de datos';
  const { error } = await supabase.from('resenas').insert({
    ...datos,
    comentario: datos.comentario.trim() || null,
  });
  return error ? error.message : null;
}

/** Trae todas las reseñas guardadas. */
export async function cargarResenas(): Promise<ResenaDB[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('resenas')
    .select('ruta_id, calificacion, impresiones, comentario, creado_en')
    .order('creado_en', { ascending: true });
  if (error) { console.warn('No se pudieron cargar las reseñas', error.message); return []; }
  return data ?? [];
}