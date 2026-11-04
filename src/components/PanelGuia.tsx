import type { EstadoGuia } from '../guia';
import type { PasoRuta } from '../ruteo';
import { vozDisponible } from '../voz';

interface Propiedades {
  estado: EstadoGuia;
  destino: string;
  vozActiva: boolean;
  porcentajeCiclorruta: number | null;
  alAlternarVoz: () => void;
  alDetener: () => void;
}

// Flecha según la maniobra
function icono(paso: PasoRuta | null): string {
  if (!paso) return '🏁';
  if (paso.maniobra === 'arrive') return '🏁';
  if (['roundabout', 'rotary', 'roundabout turn'].includes(paso.maniobra)) return '🔄';
  switch (paso.giro) {
    case 'left': return '↰';
    case 'right': return '↱';
    case 'slight left': return '↖';
    case 'slight right': return '↗';
    case 'sharp left': return '⤶';
    case 'sharp right': return '⤷';
    case 'uturn': return '↩';
    default: return '⬆';
  }
}

function metros(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.max(10, Math.round(m / 10) * 10)} m`;
}

function minutos(min: number): string {
  const t = Math.max(1, Math.round(min));
  if (t < 60) return `${t} min`;
  return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`;
}

export function PanelGuia({ estado, destino, vozActiva, porcentajeCiclorruta, alAlternarVoz, alDetener }: Propiedades) {
  const { paso } = estado;
  const llegando = !paso || paso.maniobra === 'arrive';
  const titulo = llegando ? `Hacia ${(destino || 'tu destino').split(' · ')[0]}` : paso.instruccion;

  return (
    <div role="status" aria-live="polite" style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 600,
      width: 'min(94%, 480px)', boxSizing: 'border-box',
      background: 'rgba(14,17,24,0.96)', border: '1px solid rgba(0,200,150,0.45)',
      borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      overflow: 'hidden', animation: 'fadeIn 0.25s ease',
    }}>
      {/* Próxima maniobra */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px' }}>
        <div style={{
          width: 54, height: 54, borderRadius: 14, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, #00e0a8, #00a37c)', color: '#00160f', fontSize: 30, fontWeight: 800,
        }}>{icono(paso)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {!llegando && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--green)', lineHeight: 1.1 }}>
              En {metros(estado.distanciaAlPasoM)}
            </div>
          )}
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginTop: llegando ? 0 : 2 }}>
            {titulo}
          </div>
          {estado.desviado && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>↻ Recalculando ruta…</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {vozDisponible() && (
            <button onClick={alAlternarVoz} aria-label={vozActiva ? 'Silenciar voz' : 'Activar voz'} title={vozActiva ? 'Silenciar voz' : 'Activar voz'} style={botonCircular}>
              {vozActiva ? '🔊' : '🔇'}
            </button>
          )}
          <button onClick={alDetener} aria-label="Detener guía" title="Detener guía" style={{ ...botonCircular, color: 'var(--red)' }}>✕</button>
        </div>
      </div>

      {/* Datos del recorrido */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 14px', padding: '8px 14px', fontSize: 12, color: 'var(--text2)',
        borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
      }}>
        {estado.calleActual && <span>📍 Vas por <strong style={{ color: 'var(--text)' }}>{estado.calleActual}</strong></span>}
        {estado.sector && <span>🏘️ {estado.sector}</span>}
        {estado.tramo && estado.desvioTramoM !== null && (
          estado.desvioTramoM > 40
            ? <span style={{ color: 'var(--amber)', fontWeight: 700 }}>⚠️ Desviado {metros(estado.desvioTramoM)} del tramo {estado.tramo}</span>
            : <span>✅ En el tramo <strong style={{ color: 'var(--text)' }}>{estado.tramo}</strong> · {estado.tramoResumen}</span>
        )}
        <span>🏁 {metros(estado.restanteKm * 1000)} · ⏱️ {minutos(estado.restanteMin)}</span>
        {porcentajeCiclorruta !== null && <span>🚲 {porcentajeCiclorruta}% por ciclorruta</span>}
      </div>
    </div>
  );
}

const botonCircular: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', cursor: 'pointer',
  background: 'rgba(255,255,255,0.07)', color: 'var(--text)', fontSize: 15, display: 'grid', placeItems: 'center', padding: 0,
};
