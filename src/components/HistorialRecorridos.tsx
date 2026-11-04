import type { Recorrido } from '../recorrido';
import { formatearCronometro } from '../utils';

interface Propiedades {
  recorridos: Recorrido[];
  alVer: (r: Recorrido) => void;
  alBorrarTodo: () => void;
}

export function HistorialRecorridos({ recorridos, alVer, alBorrarTodo }: Propiedades) {
  const totalKm = recorridos.reduce((suma, r) => suma + r.distanciaKm, 0);
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>🧭 Mis recorridos</div>
        {recorridos.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{recorridos.length} · {totalKm.toFixed(1).replace('.', ',')} km</span>
        )}
      </div>

      {recorridos.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          Aún no hay recorridos. Se guardan solos cuando te mueves con la app abierta.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recorridos.map(r => (
            <div key={r.id} style={{
              background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {r.distanciaKm.toFixed(2).replace('.', ',')} km · {formatearCronometro(r.segundos)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {new Date(r.inicio).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' · '}{r.velocidadMediaKmh.toFixed(1).replace('.', ',')} km/h{r.rutaNombre ? ` · ${r.rutaNombre}` : ''}
                </div>
              </div>
              <button onClick={() => alVer(r)} style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)', color: 'var(--text)',
                borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0,
              }}>🗺️ Ver</button>
            </div>
          ))}
          <button onClick={() => { if (window.confirm('¿Borrar todo el historial de recorridos?')) alBorrarTodo(); }} style={{
            background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', alignSelf: 'flex-start', padding: 0,
          }}>Borrar historial</button>
        </div>
      )}
    </div>
  );
}
