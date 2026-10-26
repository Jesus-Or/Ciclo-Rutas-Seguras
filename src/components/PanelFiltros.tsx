import { NivelSeguridad } from '../types';

interface PropiedadesPanelFiltros {
  seguridadSeleccionada: NivelSeguridad | 'todas';
  alCambiarSeguridad: (v: NivelSeguridad | 'todas') => void;
}

const filtros: { valor: NivelSeguridad | 'todas'; etiqueta: string }[] = [
  { valor: 'todas',       etiqueta: '🗺️ Todas' },
  { valor: 'segura',      etiqueta: '✅ Seguras' },
  { valor: 'moderada',  etiqueta: '⚠️ Moderadas' },
  { valor: 'peligrosa', etiqueta: '🚫 Peligrosas' },
];

export function PanelFiltros({ seguridadSeleccionada, alCambiarSeguridad }: PropiedadesPanelFiltros) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--muted)',
        marginBottom: 10,
      }}>
        Filtrar por seguridad
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filtros.map(f => {
          const activo = seguridadSeleccionada === f.valor;
          return (
            <button
              key={f.valor}
              onClick={() => alCambiarSeguridad(f.valor)}
              style={{
                background: activo ? 'var(--green-dim)' : 'var(--bg3)',
                border: `1px solid ${activo ? 'var(--green)' : 'var(--border)'}`,
                color: activo ? 'var(--green)' : 'var(--text2)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: activo ? 700 : 400,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.15s',
              }}
            >
              {f.etiqueta}
            </button>
          );
        })}
      </div>
    </div>
  );
}
