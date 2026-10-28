import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Mantiene al día el usuario que inició sesión (también cuando vuelve de Google)
export function useSesion() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
      setCargando(false);
    });
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setUsuario(sesion?.user ?? null);
    });
    return () => suscripcion.subscription.unsubscribe();
  }, []);

  const cerrarSesion = async () => { await supabase?.auth.signOut(); };

  return { usuario, cargando, cerrarSesion };
}

// Nombre para mostrar: el que escribió al registrarse o la parte del correo antes de la @
export function nombreDeUsuario(usuario: User): string {
  const nombre = usuario.user_metadata?.nombre ?? usuario.user_metadata?.full_name;
  return (nombre as string | undefined) || (usuario.email?.split('@')[0] ?? 'Ciclista');
}
