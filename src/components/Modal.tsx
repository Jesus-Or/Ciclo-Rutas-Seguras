import React from 'react';

interface PropiedadesModal {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  anchoMaximo?: number;
}

export function Modal({ abierto, alCerrar, titulo, subtitulo, children, anchoMaximo = 460 }: PropiedadesModal) {
  if (!abierto) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) alCerrar(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 9000,
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          maxWidth: anchoMaximo,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          animation: 'slideUp 0.25s ease both',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Cerrar */}
        <button
          onClick={alCerrar}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: 15,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          ✕
        </button>

        {/* Encabezado */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 21,
          fontWeight: 800,
          marginBottom: 4,
          paddingRight: 40,
        }}>
          {titulo}
        </h2>
        {subtitulo && (
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 22 }}>
            {subtitulo}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

// ── Etiqueta de sección reutilizable ────────────────────────────────────
export function SeccionModal({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--muted)',
        marginBottom: 10,
      }}>
        {etiqueta}
      </div>
      {children}
    </div>
  );
}

// ── Selector de etiquetas ─────────────────────────────────────────────
interface PropiedadesSelector {
  opciones: { valor: string; emoji: string }[];
  seleccionados: string[];
  alAlternar: (v: string) => void;
  peligro?: boolean;
}

export function SelectorEtiquetas({ opciones, seleccionados, alAlternar, peligro }: PropiedadesSelector) {
  const colorActivo = peligro ? 'var(--red)' : 'var(--green)';
  const fondoActivo    = peligro ? 'var(--red-dim)' : 'var(--green-dim)';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {opciones.map(o => {
        const estaActivo = seleccionados.includes(o.valor);
        return (
          <button
            key={o.valor}
            onClick={() => alAlternar(o.valor)}
            style={{
              background: estaActivo ? fondoActivo : 'var(--bg3)',
              border: `1px solid ${estaActivo ? colorActivo : 'var(--border)'}`,
              color: estaActivo ? colorActivo : 'var(--text2)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 13px',
              fontSize: 12,
              fontWeight: estaActivo ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
            }}
          >
            {o.emoji} {o.valor}
          </button>
        );
      })}
    </div>
  );
}
