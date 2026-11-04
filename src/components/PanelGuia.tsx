
import type { PasoRuta } from '../types';
import { formatearMetros, formatearReloj } from '../enrutamiento';
import { colorSeguridad, etiquetaSeguridad, EstimacionSeguridadRuta } from '../utils';

interface Props {
  paso: PasoRuta | null;
  distanciaAlPaso: number | null;
  distanciaRestante: number | null;
  segundos: number;
  finalizada: boolean;
  calculando: boolean;
  vozActiva: boolean;
  onAlternarVoz: () => void;
  seguridad?: EstimacionSeguridadRuta | null;
}

function icono(paso: PasoRuta | null): string {
  const t = (paso?.instruccion ?? '').toLowerCase();

  if (t.includes('llegado')) return '🏁';
  if (t.includes('vuelta en u')) return '↩️';
  if (t.includes('glorieta')) return '🔄';
  if (t.includes('izquierda')) return '⬅️';
  if (t.includes('derecha')) return '➡️';

  return '⬆️';
}

export function PanelGuia({
  paso,
  distanciaAlPaso,
  distanciaRestante,
  segundos,
  finalizada,
  calculando,
  vozActiva,
  onAlternarVoz,
  seguridad,
}: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 600,
        maxWidth: 520,
        margin: '0 auto',
        background: 'rgba(22,27,38,0.96)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {finalizada ? (
          <>
            <strong style={{ fontSize: 16 }}>
              ¡Recorrido culminado!
            </strong>

            <div style={{ fontSize: 13, opacity: 0.8 }}>
              Tiempo total: {formatearReloj(segundos)}
            </div>
          </>
        ) : calculando ? (
          <>
            <strong style={{ fontSize: 15 }}>
              Calculando tu ruta por las calles…
            </strong>

            <div style={{ fontSize: 13, opacity: 0.8 }}>
              ⏱ {formatearReloj(segundos)}
            </div>
          </>
        ) : (
          <>
            <strong style={{ fontSize: 15 }}>
              {icono(paso)} {paso?.instruccion ?? 'Sigue por la ruta'}
            </strong>

            <div style={{ fontSize: 12.5, opacity: 0.8 }}>
              {distanciaAlPaso !== null &&
                paso?.tipo !== 'arrive' &&
                `En ${formatearMetros(distanciaAlPaso)} · `}

              {distanciaRestante !== null &&
                `Faltan ${formatearMetros(distanciaRestante)} · `}

              ⏱ {formatearReloj(segundos)}
            </div>
          </>
        )}

        {seguridad && !finalizada && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontWeight: 700,
              color: colorSeguridad(seguridad.nivel),
            }}
          >
            {seguridad.nivel === 'segura'
              ? '✅'
              : seguridad.nivel === 'moderada'
                ? '⚠️'
                : '🚫'}

            {' '}Ruta {etiquetaSeguridad(seguridad.nivel).toLowerCase()}

            <span
              style={{
                fontWeight: 400,
                color: 'var(--muted)',
              }}
            >
              {' '}· {seguridad.motivo}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onAlternarVoz}
        aria-label={
          vozActiva
            ? 'Silenciar guía de voz'
            : 'Activar guía de voz'
        }
        title={
          vozActiva
            ? 'Silenciar guía de voz'
            : 'Activar guía de voz'
        }
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          flexShrink: 0,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text)',
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        {vozActiva ? '🔊' : '🔇'}
      </button>
    </div>
  );
}
