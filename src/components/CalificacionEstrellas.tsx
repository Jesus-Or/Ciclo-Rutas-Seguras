import { useState } from 'react';
import { ETIQUETAS_CALIFICACION } from '../utils';

interface PropiedadesCalificacionEstrellas {
  valor: number;
  alCambiar: (v: number) => void;
  tamano?: number;
  mostrarEtiqueta?: boolean;
}

export function CalificacionEstrellas({ valor, alCambiar, tamano = 28, mostrarEtiqueta = true }: PropiedadesCalificacionEstrellas) {
  const [sobre, setSobre] = useState(0);
  const mostrado = sobre || valor;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <span
            key={v}
            onClick={() => alCambiar(v)}
            onMouseEnter={() => setSobre(v)}
            onMouseLeave={() => setSobre(0)}
            style={{
              fontSize: tamano,
              cursor: 'pointer',
              filter: v <= mostrado ? 'none' : 'grayscale(1) brightness(0.35)',
              transform: v === mostrado ? 'scale(1.18)' : 'scale(1)',
              transition: 'all 0.12s ease',
              display: 'inline-block',
              userSelect: 'none',
            }}
          >
            ⭐
          </span>
        ))}
      </div>
      {mostrarEtiqueta && (
        <div style={{
          fontSize: 13,
          color: mostrado ? 'var(--text2)' : 'var(--muted)',
          marginTop: 8,
          minHeight: 18,
          fontStyle: mostrado ? 'normal' : 'italic',
        }}>
          {mostrado ? ETIQUETAS_CALIFICACION[mostrado] : 'Selecciona una calificación'}
        </div>
      )}
    </div>
  );
}
