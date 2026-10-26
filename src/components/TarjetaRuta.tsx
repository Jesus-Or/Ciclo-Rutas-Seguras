import React from 'react';
import { RutaCiclista } from '../types';
import { minutosPorDistancia, formatearDuracion, colorSeguridad, etiquetaSeguridad, promedioCalificacion, formatearCalificacion } from '../utils';

interface PropiedadesTarjetaRuta {
  ruta: RutaCiclista;
  estaSeleccionada: boolean;
  estaGuardada: boolean;
  alSeleccionar: () => void;
  alGuardar: () => void;
  alIniciar: () => void;
  alReportar: () => void;
  velocidadKmh: number;
}

export function TarjetaRuta({
  ruta, estaSeleccionada, estaGuardada, velocidadKmh,
  alSeleccionar, alGuardar, alIniciar, alReportar,
}: PropiedadesTarjetaRuta) {
  const color = colorSeguridad(ruta.nivelSeguridad);
  const promedio   = promedioCalificacion(ruta);

  return (
    <div
      onClick={alSeleccionar}
      style={{
        background: estaSeleccionada ? `rgba(${hexARgb(color)}, 0.06)` : 'var(--bg3)',
        border: `1px solid ${estaSeleccionada ? color : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        marginBottom: 10,
        cursor: 'pointer',
        transition: 'all 0.18s',
        animation: 'fadeIn 0.25s ease both',
      }}
    >
      {/* Fila de encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 700,
          flex: 1,
          lineHeight: 1.3,
        }}>
          {ruta.nombre}
        </h3>
        <span style={{
          background: `rgba(${hexARgb(color)}, 0.15)`,
          color,
          border: `1px solid rgba(${hexARgb(color)}, 0.35)`,
          borderRadius: 20,
          padding: '3px 10px',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {etiquetaSeguridad(ruta.nivelSeguridad)}
        </span>
      </div>

      {/* Descripción */}
      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.45 }}>
        {ruta.descripcion}
      </p>

      {/* Metadatos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
        <span>📏 {ruta.distancia} km</span>
        <span>⏱️ {formatearDuracion(minutosPorDistancia(ruta.distancia, velocidadKmh))}</span>
        <span style={{ color: 'var(--amber)' }}>
          {'⭐'.repeat(Math.round(promedio))}{'☆'.repeat(5 - Math.round(promedio))}
          {' '}
          <span style={{ color: 'var(--muted)' }}>
            {promedio ? `${formatearCalificacion(ruta)} (${ruta.calificaciones.length})` : 'Sin calificaciones'}
          </span>
        </span>
      </div>

      {/* Etiquetas de características */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {ruta.caracteristicas.map(f => (
          <span key={f} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: 11,
            color: 'var(--muted)',
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* Fila de acciones */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {ruta.resenas.length} reseña{ruta.resenas.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Guardar */}
          <BotonIcono
            titulo={estaGuardada ? 'Quitar de guardados' : 'Guardar ruta'}
            onClick={alGuardar}
            activo={estaGuardada}
            colorActivo="var(--amber)"
          >
            {estaGuardada ? '⭐' : '☆'}
          </BotonIcono>

          {/* Inicio */}
          <BotonIcono titulo="Iniciar ruta" onClick={alIniciar} colorActivo="var(--green)">
            ▶
          </BotonIcono>

          {/* Reportar */}
          <BotonIcono titulo="Reportar incidente" onClick={alReportar} colorActivo="var(--red)">
            ⚠️
          </BotonIcono>
        </div>
      </div>
    </div>
  );
}

// ── Función auxiliar pequeña ──────────────────────────────────────────────
function BotonIcono({
  titulo, onClick, activo, colorActivo, children,
}: {
  titulo: string;
  onClick: () => void;
  activo?: boolean;
  colorActivo: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={titulo}
      onClick={onClick}
      style={{
        background: activo ? `rgba(${hexARgb(colorActivo)}, 0.15)` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${activo ? colorActivo : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        width: 30,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}

// Convierte una variable CSS o color hex a formato "r,g,b"
function hexARgb(variableColor: string): string {
  const map: Record<string, string> = {
    'var(--green)': '0,200,150',
    'var(--red)':   '255,71,87',
    'var(--amber)': '255,177,66',
    'var(--accent)':'95,127,255',
  };
  return map[variableColor] ?? '255,255,255';
}
