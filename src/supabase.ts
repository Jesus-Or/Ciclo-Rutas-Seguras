import { createClient } from '@supabase/supabase-js';

// Las llaves salen de las variables de entorno (archivo .env en tu PC, nunca en el repositorio):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=tu-llave-anon-publica
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const llaveAnonima = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Si faltan las llaves, la app sigue funcionando sin login (modo demostración)
export const supabaseConfigurado = Boolean(url && llaveAnonima);

export const supabase = supabaseConfigurado ? createClient(url!, llaveAnonima!) : null;
