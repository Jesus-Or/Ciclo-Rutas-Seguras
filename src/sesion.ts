import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Detecta si el usuario llegó desde el enlace del correo de recuperación
function llegoDeRecuperacion(): boolean {
  if (typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  return window.location.hash.includes('type=recovery') || query.get('recuperar') === '1';
}

// Mantiene al día el usuario que inició sesión (también cuando vuelve de Google)
export function useSesion() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(Boolean(supabase));
  const [recuperando, setRecuperando] = useState<boolean>(llegoDeRecuperacion);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
      setCargando(false);
    });
    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
      setUsuario(sesion?.user ?? null);
    });
    return () => suscripcion.subscription.unsubscribe();
  }, []);

  const terminarRecuperacion = () => {
    setRecuperando(false);
    // Limpia la URL (quita el token o el parámetro de recuperación)
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const cerrarSesion = async () => {
    setRecuperando(false);
    await supabase?.auth.signOut();
  };

  return { usuario, cargando, recuperando, terminarRecuperacion, cerrarSesion };
}

// Nombre para mostrar: el que escribió al registrarse o la parte del correo antes de la @
export function nombreDeUsuario(usuario: User): string {
  const nombre = usuario.user_metadata?.nombre ?? usuario.user_metadata?.full_name;
  return (nombre as string | undefined) || (usuario.email?.split('@')[0] ?? 'Ciclista');
}