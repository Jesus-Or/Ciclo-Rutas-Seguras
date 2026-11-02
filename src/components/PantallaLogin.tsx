import { useState, FormEvent } from 'react';
import { supabase } from '../supabase';

type Modo = 'ingresar' | 'registro' | 'recuperar';

// Traduce los errores más comunes de Supabase
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Falta confirmar tu correo. Revisa tu bandeja de entrada.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'El correo no es válido.';
  return mensaje;
}

const estiloCampo: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hover)', background: 'var(--bg3)', color: 'var(--text)',
  fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
};

export function PantallaLogin() {
  const [modo, setModo] = useState<Modo>('ingresar');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // SE MODIFICA AQUÍ: Permitimos que el botón se muestre tanto en la versión web como en el APK móvil.
  const permitirGoogle = true;

  const cambiarModo = (nuevo: Modo) => { setModo(nuevo); setError(''); setInfo(''); };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(''); setInfo(''); setCargando(true);
    try {
      if (modo === 'ingresar') {
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
        if (error) throw error;
      } else if (modo === 'registro') {
        const { data, error } = await supabase.auth.signUp({
          email: correo,
          password: contrasena,
          options: { data: { nombre: nombre.trim() } },
        });
        if (error) throw error;
        // Si Supabase pide confirmar el correo, no habrá sesión todavía
        if (!data.session) setInfo('Cuenta creada. Revisa tu correo y confirma para poder ingresar.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(correo, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        setInfo('Te enviamos un enlace para restablecer la contraseña.');
      }
    } catch (err) {
      setError(traducirError(err instanceof Error ? err.message : 'Ocurrió un error. Inténtalo de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  const ingresarConGoogle = async () => {
    if (!supabase) return;
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setError(traducirError(error.message));
  };

  const titulo = modo === 'ingresar' ? 'Inicia sesión' : modo === 'registro' ? 'Crea tu cuenta' : 'Recuperar contraseña';

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16,
      background: 'var(--bg)', fontFamily: 'var(--font-body)', color: 'var(--text)',
    }}>
      <div style={{
        width: '100%', maxWidth: 400, background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 28, boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            background: 'var(--green)', color: '#000', width: 52, height: 52, borderRadius: 14,
            display: 'grid', placeItems: 'center', fontSize: 28, margin: '0 auto 12px',
          }}>🚴</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Ciclo Rutas Seguras</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Bogotá · {titulo}</div>
        </div>

        <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modo === 'registro' && (
            <input style={estiloCampo} type="text" placeholder="Tu nombre" value={nombre}
              onChange={e => setNombre(e.target.value)} required autoComplete="name" />
          )}
          <input style={estiloCampo} type="email" placeholder="Correo electrónico" value={correo}
            onChange={e => setCorreo(e.target.value)} required autoComplete="email" />
          {modo !== 'recuperar' && (
            <input style={estiloCampo} type="password" placeholder="Contraseña (mínimo 6 caracteres)" value={contrasena}
              onChange={e => setContrasena(e.target.value)} required minLength={6}
              autoComplete={modo === 'ingresar' ? 'current-password' : 'new-password'} />
          )}

          {error && (
            <div style={{ fontSize: 12.5, color: 'var(--red)', background: 'var(--red-dim)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ fontSize: 12.5, color: 'var(--green)', background: 'var(--green-dim)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
              {info}
            </div>
          )}

          <button type="submit" disabled={cargando} style={{
            background: 'var(--green)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)',
            padding: '12px 16px', fontSize: 14, fontWeight: 800, cursor: cargando ? 'wait' : 'pointer',
            fontFamily: 'var(--font-display)', opacity: cargando ? 0.7 : 1,
          }}>
            {cargando ? 'Un momento…' : modo === 'ingresar' ? 'Ingresar' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
        </form>

        {permitirGoogle && modo !== 'recuperar' && (
          <>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', margin: '14px 0' }}>o</div>
            <button type="button" onClick={ingresarConGoogle} style={{
              width: '100%', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border-hover)',
              borderRadius: 'var(--radius-md)', padding: '11px 16px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: 'block' }}>
                <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.71H.92v2.32C2.4 15.86 5.43 18 9 18z" fill="#34A853"/>
                <path d="M3.95 10.69c-.18-.54-.28-1.12-.28-1.69s.1-1.15.28-1.69V5.01H.92A8.99 8.99 0 0 0 0 9c0 1.46.35 2.85.92 4.09l3.03-2.4z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A8.99 8.99 0 0 0 9 0C5.43 0 2.4 2.14.92 5.01l3.03 2.32C4.66 5.16 6.65 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </>
        )}

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', fontSize: 13 }}>
          {modo === 'ingresar' && (
            <>
              <LinkBoton onClick={() => cambiarModo('registro')}>¿No tienes cuenta? Regístrate</LinkBoton>
              <LinkBoton onClick={() => cambiarModo('recuperar')}>Olvidé mi contraseña</LinkBoton>
            </>
          )}
          {modo !== 'ingresar' && <LinkBoton onClick={() => cambiarModo('ingresar')}>← Volver a iniciar sesión</LinkBoton>}
        </div>
      </div>
    </div>
  );
}

function LinkBoton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
      fontSize: 13, fontFamily: 'var(--font-body)', padding: 2,
    }}>
      {children}
    </button>
  );
}
