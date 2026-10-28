// import { createClient } from '@supabase/supabase-js';

// // Las llaves salen de las variables de entorno (archivo .env en tu PC, nunca en el repositorio):
// //   VITE_SUPABASE_URL=https://xxxx.supabase.co
// //   VITE_SUPABASE_ANON_KEY=tu-llave-anon-publica
// const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// const llaveAnonima = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// // Si faltan las llaves, la app sigue funcionando sin login (modo demostración)
// export const supabaseConfigurado = Boolean(url && llaveAnonima);

// export const supabase = supabaseConfigurado ? createClient(url!, llaveAnonima!) : null;
import { createClient } from '@supabase/supabase-js';

// Colocamos las credenciales directamente para que funcionen tanto en local como en GitHub Pages
const url = 'https://supabase.co';

// Pega aquí la clave pública que acabas de copiar
const llaveAnonima = 'sb_publishable_iaGxL9k6gV7Hsam2dxpzFg_1h1h1L2w'; // <-- Aquí pegas todo el texto largo completo

// Mantenemos esta variable en true para que tu App.tsx sepa que el login está activo
export const supabaseConfigurado = true;

// Creamos e exportamos el cliente listo para producción
export const supabase = createClient(url, llaveAnonima);

