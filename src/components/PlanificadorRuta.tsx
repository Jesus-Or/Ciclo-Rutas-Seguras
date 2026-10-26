import React, { useState, useEffect, useRef } from 'react';
import { PuntoRuta } from '../types';
import { PERFILES_VELOCIDAD, estimarTiempoRecorrido, formatearDuracion, formatearDistancia } from '../utils';
import { ubicacionesPredefinidas } from '../data';
import { buscarLugar, ResultadoGeocodificacion } from '../geocode';

interface PropiedadesPlanificadorRuta {
  puntoInicio: PuntoRuta | null;
  puntoDestino:   PuntoRuta | null;
  alFijarDestino:   (p: PuntoRuta) => void;
  alLimpiar:    () => void;
  alCambiarModoClic: (modo: 'inicio' | 'destino') => void;
  modoClic:  'inicio' | 'destino' | null;
  alUsarMiUbicacion: () => void;
  velocidadKmh: number;
  alCambiarVelocidad: (kmh: number) => void;
}

export function PlanificadorRuta({
  puntoInicio, puntoDestino, alFijarDestino, alLimpiar, alCambiarModoClic, modoClic, alUsarMiUbicacion, velocidadKmh, alCambiarVelocidad,
}: PropiedadesPlanificadorRuta) {

  return (
    <div style={{ animation: 'fadeIn 0.25s ease both' }}>
      {/* ── Inicio ───────────────────────────────────────────── */}
      <div style={cajaPunto('#009e78', 'rgba(0,200,150,0.12)')}>
        <div style={{ ...etiquetaPunto, color: 'var(--green)' }}>📍 Punto de Partida (tu ubicación)</div>

        {puntoInicio ? (
          <>
            <PuntoConfirmado punto={puntoInicio} color="var(--green)" />
            <button onClick={alUsarMiUbicacion} style={botonUbicacion}>
              🔄 Actualizar mi ubicación
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              Buscando tu ubicación… Acepta el permiso de ubicación cuando se solicite.
            </div>
            <button onClick={alUsarMiUbicacion} style={botonUbicacion}>
              🎯 Reintentar ubicación
            </button>
          </>
        )}
      </div>

      {/* ── Destino ─────────────────────────────────────────────── */}
      <div style={cajaPunto('#c0392b', 'rgba(255,71,87,0.10)')}>
        <div style={{ ...etiquetaPunto, color: 'var(--red)' }}>🎯 Destino</div>

        {puntoDestino ? (
          <PuntoConfirmado punto={puntoDestino} color="var(--red)" />
        ) : (
          <>
            <BuscadorLugar
              textoGuia="¿A dónde quieres ir? Ej: Chapinero"
              color="var(--red)"
              alSeleccionar={r => alFijarDestino({ posicion: { latitud: r.latitud, longitud: r.longitud }, direccion: r.nombreMostrado, tipo: 'destino' })}
            />
            <BotonMarcarEnMapa
              activo={modoClic === 'destino'}
              onClick={() => alCambiarModoClic('destino')}
              etiqueta="Marcar en mapa"
              color="var(--red)"
            />
            <UbicacionesRapidas
              alSeleccionar={lugar => alFijarDestino({ posicion: { latitud: lugar.latitud, longitud: lugar.longitud }, direccion: lugar.nombre, tipo: 'destino' })}
            />
          </>
        )}
      </div>

      {/* ── Tiempo estimado del recorrido ──────────────────────── */}
      {puntoInicio && puntoDestino && (() => {
        const estimacion = estimarTiempoRecorrido(puntoInicio.posicion, puntoDestino.posicion, velocidadKmh);
        return (
          <div style={{
            border: '1px solid var(--border-hover)', background: 'var(--bg3)',
            borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 12,
          }}>
            <div style={{ ...etiquetaPunto, color: 'var(--text2)', marginBottom: 6 }}>⏱️ Tiempo estimado</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
                {formatearDuracion(estimacion.minutos)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {formatearDistancia(estimacion.distanciaKm)} aprox. a {velocidadKmh} km/h
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PERFILES_VELOCIDAD.map(perfil => {
                const activo = perfil.kmh === velocidadKmh;
                return (
                  <button key={perfil.kmh} onClick={() => alCambiarVelocidad(perfil.kmh)} style={{
                    background: activo ? 'var(--green-dim)' : 'transparent',
                    border: `1px solid ${activo ? 'var(--green)' : 'var(--border)'}`,
                    color: activo ? 'var(--green)' : 'var(--text2)',
                    borderRadius: 20, padding: '5px 12px', fontSize: 12,
                    fontWeight: activo ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}>
                    {perfil.etiqueta} · {perfil.kmh} km/h
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              Elige tu ritmo: el tiempo se recalcula al instante. Es una estimación, el tránsito y los semáforos pueden variarlo.
            </div>
          </div>
        );
      })()}

      {puntoDestino && (
        <button onClick={alLimpiar} style={{
          width: '100%',
          padding: '10px',
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          marginTop: 4,
        }}>
          🗑️ Cambiar destino
        </button>
      )}

      {/* Consejo */}
      <div style={{
        marginTop: 16,
        padding: '10px 14px',
        background: 'var(--accent-dim)',
        border: '1px solid rgba(95,127,255,0.2)',
        borderRadius: 'var(--radius-md)',
        fontSize: 12,
        color: 'var(--text2)',
      }}>
        💡 <strong style={{ color: 'var(--text)' }}>Tip:</strong> Tu punto de partida es tu ubicación actual. Solo escribe el nombre de tu destino o márcalo en el mapa.
      </div>
    </div>
  );
}

// ── Buscador de lugares con sugerencias ─────────────────────────
function BuscadorLugar({ textoGuia, color, alSeleccionar }: {
  textoGuia: string;
  color: string;
  alSeleccionar: (r: ResultadoGeocodificacion) => void;
}) {
  const [consulta, setConsulta]       = useState('');
  const [resultados, setResultados]   = useState<ResultadoGeocodificacion[]>([]);
  const [cargando, setCargando]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [abierto, setAbierto]         = useState(false);
  const refTemporizador             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refCaja                  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (refTemporizador.current) clearTimeout(refTemporizador.current);

    if (consulta.trim().length < 3) {
      setResultados([]);
      setError(null);
      setAbierto(false);
      return;
    }

    setCargando(true);
    refTemporizador.current = setTimeout(async () => {
      try {
        const encontrados = await buscarLugar(consulta);
        setResultados(encontrados);
        setError(encontrados.length === 0 ? 'No se encontraron lugares con ese nombre' : null);
        setAbierto(true);
      } catch {
        setError('No se pudo buscar el lugar. Revisa tu conexión.');
        setResultados([]);
        setAbierto(true);
      } finally {
        setCargando(false);
      }
    }, 500); // espera a que el usuario pare de escribir

    return () => {
      if (refTemporizador.current) clearTimeout(refTemporizador.current);
    };
  }, [consulta]);

  // Cierra el dropdown si se hace clic afuera
  useEffect(() => {
    const manejador = (e: MouseEvent) => {
      if (refCaja.current && !refCaja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', manejador);
    return () => document.removeEventListener('mousedown', manejador);
  }, []);

  const manejarSeleccion = (r: ResultadoGeocodificacion) => {
    alSeleccionar(r);
    setConsulta('');
    setResultados([]);
    setAbierto(false);
  };

  return (
    <div ref={refCaja} style={{ position: 'relative', marginBottom: 8 }}>
      <input
        value={consulta}
        onChange={e => setConsulta(e.target.value)}
        onFocus={() => resultados.length > 0 && setAbierto(true)}
        placeholder={textoGuia}
        style={estiloInput}
      />

      {cargando && (
        <div style={{ position: 'absolute', right: 10, top: 9, fontSize: 12, color: 'var(--muted)' }}>
          Buscando…
        </div>
      )}

      {abierto && (resultados.length > 0 || error) && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 20,
          background: 'var(--bg2, #14161f)',
          border: `1px solid ${color}`,
          borderRadius: 'var(--radius-md)',
          marginTop: 4,
          maxHeight: 220,
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          {error && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>
              {error}
            </div>
          )}
          {resultados.map((r, i) => (
            <button
              key={i}
              onClick={() => manejarSeleccion(r)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: i < resultados.length - 1 ? '1px solid var(--border)' : 'none',
                color: 'var(--text)',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              📍 {r.nombreMostrado}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────

function PuntoConfirmado({ punto, color }: { punto: PuntoRuta; color: string }) {
  return (
    <div style={{
      background: `rgba(${color === 'var(--green)' ? '0,200,150' : '255,71,87'}, 0.1)`,
      border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      fontSize: 13,
    }}>
      <strong>{punto.direccion ?? `${punto.tipo === 'inicio' ? 'Inicio' : 'Destino'}`}</strong>
      <br />
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        {punto.posicion.latitud.toFixed(4)}, {punto.posicion.longitud.toFixed(4)}
      </span>
    </div>
  );
}

function BotonMarcarEnMapa({ activo, onClick, etiqueta, color }: { activo: boolean; onClick: () => void; etiqueta: string; color: string }) {
  return (
    <button onClick={onClick} style={{
      width: '100%',
      padding: '9px',
      marginBottom: 8,
      background: activo ? color : 'transparent',
      color: activo ? (color === 'var(--green)' ? '#000' : '#fff') : 'var(--text2)',
      border: `1px solid ${activo ? color : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      transition: 'all 0.15s',
    }}>
      {activo ? `✓ Haz clic en el mapa para ${etiqueta.includes('inicio') ? 'inicio' : 'destino'}` : `📍 ${etiqueta}`}
    </button>
  );
}

function UbicacionesRapidas({ alSeleccionar }: { alSeleccionar: (l: typeof ubicacionesPredefinidas[0]) => void }) {
  return (
    <details style={{ marginBottom: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--muted)', userSelect: 'none' }}>
        Ubicaciones rápidas ▾
      </summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {ubicacionesPredefinidas.map(lugar => (
          <button
            key={lugar.nombre}
            onClick={() => alSeleccionar(lugar)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px 9px',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              color: 'var(--text2)',
            }}
          >
            {lugar.nombre}
          </button>
        ))}
      </div>
    </details>
  );
}

// ── Estilos ────────────────────────────────────────────────
const botonUbicacion: React.CSSProperties = {
  width: '100%', padding: '9px', marginTop: 8,
  background: 'var(--green-dim)', color: 'var(--green)',
  border: '1px solid var(--green)', borderRadius: 'var(--radius-md)',
  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
};
const cajaPunto = (colorBorde: string, fondo: string): React.CSSProperties => ({
  border: `1px solid ${colorBorde}`,
  borderRadius: 'var(--radius-md)',
  padding: '12px 14px',
  marginBottom: 12,
  background: fondo,
});

const etiquetaPunto: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 10,
};

const estiloInput: React.CSSProperties = {
  flex: 1,
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  marginBottom: 8,
  boxSizing: 'border-box',
};
