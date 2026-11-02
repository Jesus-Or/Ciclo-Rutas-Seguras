import { useState } from 'react';
import { supabase } from '../supabase';

export function NuevaContrasena({ alTerminar }: { alTerminar: () => void }) {
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (clave.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    if (clave !== confirmar) return setError('Las contraseñas no coinciden');
    if (!supabase) return setError('No hay conexión con el servidor');

    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setGuardando(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes('session')
          ? 'El enlace venció o ya fue usado. Pide uno nuevo desde "Recuperar contraseña".'
          : error.message
      );
      return;
    }
    setExito(true);
    setTimeout(alTerminar, 1500);
  };

  const campo: React.CSSProperties = {
    padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)',
    background: 'var(--bg3)', color: 'var(--text)', fontSize: 15,
    fontFamily: 'var(--font-body)',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <form onSubmit={guardar} style={{
        width: 340, maxWidth: '92vw', padding: 28, borderRadius: 20,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>
          Nueva contraseña
        </div>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Escribe la nueva contraseña para tu cuenta
        </div>

        <input type="password" value={clave} onChange={e => setClave(e.target.value)}
          placeholder="Nueva contraseña" autoComplete="new-password" style={campo} />
        <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
          placeholder="Confirmar contraseña" autoComplete="new-password" style={campo} />

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        )}
        {exito && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,200,150,0.12)', color: 'var(--green)', fontSize: 13 }}>
            Contraseña actualizada. Entrando…
          </div>
        )}

        <button type="submit" disabled={guardando || exito} style={{
          padding: '12px 14px', borderRadius: 12, border: 'none', background: 'var(--green)',
          color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer',
          fontFamily: 'var(--font-display)',
        }}>
          {guardando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}