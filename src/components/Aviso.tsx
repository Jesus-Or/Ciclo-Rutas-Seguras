import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ── Tipos ─────────────────────────────────────────────────────
type TipoAviso = 'exito' | 'error' | 'info';

interface MensajeAviso {
  id: number;
  mensaje: string;
  tipo: TipoAviso;
}

interface ContextoAviso {
  mostrarAviso: (mensaje: string, tipo?: TipoAviso) => void;
}

// ── Contexto ───────────────────────────────────────────────────
const ContextoAvisos = createContext<ContextoAviso>({ mostrarAviso: () => {} });

export function useAviso() {
  return useContext(ContextoAvisos);
}

// ── Proveedor ──────────────────────────────────────────────────
export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<MensajeAviso[]>([]);
  const contador = useRef(0);

  const mostrarAviso = useCallback((mensaje: string, tipo: TipoAviso = 'exito') => {
    const id = ++contador.current;
    setAvisos(anterior => [...anterior, { id, mensaje, tipo }]);
    setTimeout(() => {
      setAvisos(anterior => anterior.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const icono = (tipo: TipoAviso) =>
    tipo === 'exito' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';

  const colorBorde = (tipo: TipoAviso) =>
    tipo === 'exito'
      ? 'rgba(0,200,150,0.4)'
      : tipo === 'error'
      ? 'rgba(255,71,87,0.4)'
      : 'rgba(95,127,255,0.4)';

  return (
    <ContextoAvisos.Provider value={{ mostrarAviso }}>
      {children}

      {/* Pila de avisos */}
      <div className="avisos-pila" style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {avisos.map(t => (
          <div
            key={t.id}
            style={{
              background: 'var(--bg3)',
              border: `1px solid ${colorBorde(t.tipo)}`,
              borderRadius: 'var(--radius-lg)',
              padding: '12px 18px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideUp 0.3s ease both',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{icono(t.tipo)}</span>
            <span>{t.mensaje}</span>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}
