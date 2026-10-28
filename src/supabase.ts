import { createClient } from '@supabase/supabase-js';

// 1. Configuramos la URL real usando tu ID de la imagen
const url = 'https://bmhaqitokyvwopfwkgog.supabase.co';

// 2. PEGA AQUÍ TU LLAVE ANÓNIMA COMPLETA (La que copiaste anteriormente que empieza por eyJhbGci...)
const llaveAnonima = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaGFxaXRva3l2d29wZndrZ29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMzk1NjgsImV4cCI6MjEwODcxNTU2OH0.Q6UiYIhDcZrQLMqx59wCLrKZEp77vsm3VRSIVXWSn9E'; 

// 3. Forzamos a la aplicación a saber que el sistema de login está activo
export const supabaseConfigurado = true;

// 4. Creamos e exportamos el cliente inicializado listo para operar
export const supabase = createClient(url, llaveAnonima);
