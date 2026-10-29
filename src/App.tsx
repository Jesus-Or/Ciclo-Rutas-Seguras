import { useState, useMemo, useEffect, useRef } from 'react';

import { MapaCiclista }           from './components/MapaCiclista';
import { TarjetaRuta }         from './components/TarjetaRuta';
import { PanelFiltros }       from './components/PanelFiltros';
import { PlanificadorRuta }      from './components/PlanificadorRuta';
import { ModalFinalizarRuta }  from './components/ModalFinalizarRuta';
import { ModalReporte }       from './components/ModalReporte';
import { DescargarApp }          from './components/DescargarApp';
import { ModalSuscripcion }    from './components/ModalSuscripcion';
import { ProveedorAvisos, useAviso } from './components/Aviso';
import { PantallaLogin } from './components/PantallaLogin';
import { supabaseConfigurado } from './supabase';
import { useSesion, nombreDeUsuario } from './sesion';
import type { User } from '@supabase/supabase-js';

import { rutasCiclistas as rutasIniciales, marcadoresMapa } from './data';
import {
  RutaCiclista, NivelSeguridad, PuntoRuta,
  ReporteIncidente, TipoPlan, CuentaUsuario, PestanaLateral, ModoClic,
} from './types';
import { obtenerUbicacionActual } from './ubicacion';
import { estimarTiempoRecorrido, minutosPorDistancia, formatearDuracion, formatearDistancia, formatearCronometro } from './utils';
import { promedioCalificacion, formatearCalificacion, estimarSeguridadRuta, colorSeguridad, etiquetaSeguridad } from './utils';

// ── App envuelta en proveedores ──────────────────────────────────
// Si Supabase está configurado, primero hay que iniciar sesión.
// Si no lo está, la app funciona sin login (modo demostración).
export default function App() {
  const { usuario, cargando, cerrarSesion } = useSesion();

  let contenido;
  if (!supabaseConfigurado) {
    contenido = <AppInterna usuario={null} />;
  } else if (cargando) {
    contenido = <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--muted)' }}>Cargando…</div>;
  } else if (!usuario) {
    contenido = <PantallaLogin />;
  } else {
    contenido = <AppInterna usuario={usuario} alCerrarSesion={cerrarSesion} />;
  }

  return <ProveedorAvisos>{contenido}</ProveedorAvisos>;
}

// ── Estructura principal ────────────────────────────────────────────────
function AppInterna({ usuario, alCerrarSesion }: { usuario: User | null; alCerrarSesion?: () => void }) {
  const { mostrarAviso } = useAviso();

  // ── Datos de rutas (mutables para las calificaciones) ─────────────────────
  const [rutas, setRutas] = useState<RutaCiclista[]>(rutasIniciales);

  // ── Estado del mapa ─────────────────────────────────────────────
  const [rutaSeleccionada, setRutaSeleccionada]   = useState<RutaCiclista | null>(null);
  const [filtroSeguridad, setFiltroSeguridad]     = useState<NivelSeguridad | 'todas'>('todas');
  const [puntoInicio, setPuntoInicio]         = useState<PuntoRuta | null>(null);
  const [puntoDestino, setPuntoDestino]             = useState<PuntoRuta | null>(null);
  const [modoClic, setModoClic]           = useState<ModoClic>(null);

  // Se recalcula automáticamente apenas hay inicio y destino elegidos
  const seguridadPlanificada = useMemo(() => {
    if (!puntoInicio || !puntoDestino) return null;
    return estimarSeguridadRuta(puntoInicio.posicion, puntoDestino.posicion, rutas, marcadoresMapa);
  }, [puntoInicio, puntoDestino, rutas]);

  // ── Ruta activa (navegación en curso) ────────────────
  const [rutaActiva, setRutaActiva]       = useState<RutaCiclista | null>(null);

  // ── Barra lateral ───────────────────────────────────────────────
  const [pestanaActiva, setPestanaActiva]           = useState<PestanaLateral>('planificar');
  const [rutasGuardadas, setRutasGuardadas]       = useState<Set<string>>(new Set());

  // ── Incidentes ─────────────────────────────────────────────
  const [incidentes, setIncidentes]           = useState<ReporteIncidente[]>([]);
  const [rutaObjetivoReporte, setRutaObjetivoReporte] = useState<string | undefined>();

  // ── Ventanas modales ────────────────────────────────────────────────
  const [finalizarAbierto, setFinalizarAbierto]         = useState(false);
  const [reporteAbierto, setReporteAbierto]         = useState(false);
  const [suscripcionAbierta, setSuscripcionAbierta]   = useState(false);

  // ── Account / Subscription ───────────────────────────────
  const [cuenta, setCuenta]               = useState<CuentaUsuario>({
    nombre: 'Usuario Trial',
    plan: 'prueba',
    diasPruebaRestantes: 15,
    esPremium: false,
  });

  // El nombre de la cuenta sale del usuario que inició sesión
  useEffect(() => {
    if (usuario) setCuenta(c => ({ ...c, nombre: nombreDeUsuario(usuario) }));
  }, [usuario]);

  // ── Valores derivados ───────────────────────────────────────────────
  const rutasFiltradas = useMemo(() =>
    filtroSeguridad === 'todas' ? rutas : rutas.filter(r => r.nivelSeguridad === filtroSeguridad),
    [rutas, filtroSeguridad]
  );

  // ── Manejadores de eventos ─────────────────────────────────────────────
  const manejarSeleccionRuta = (ruta: RutaCiclista) => {
    setRutaSeleccionada(anterior => anterior?.id === ruta.id ? null : ruta);
  };

  // ── Tiempo de recorrido ───────────────────────────────────
  const [velocidadKmh, setVelocidadKmh] = useState(15);     // velocidad promedio de la persona
  const [segundos, setSegundos] = useState(0);              // cronómetro de la ruta en curso
  const [segundosFinal, setSegundosFinal] = useState(0);    // tiempo real al terminar
  const [avisoCerrado, setAvisoCerrado] = useState(false);  // el usuario cerró el aviso de seguridad
  // El aviso vuelve a aparecer cuando cambia el inicio o el destino
  useEffect(() => { setAvisoCerrado(false); }, [puntoInicio, puntoDestino]);

  useEffect(() => {
    if (!rutaActiva || finalizarAbierto) return;
    const intervalo = setInterval(() => setSegundos(s => s + 1), 1000);
    return () => clearInterval(intervalo);
  }, [rutaActiva, finalizarAbierto]);

  const tiempoPlanificado = useMemo(() => {
    if (!puntoInicio || !puntoDestino) return null;
    return estimarTiempoRecorrido(puntoInicio.posicion, puntoDestino.posicion, velocidadKmh);
  }, [puntoInicio, puntoDestino, velocidadKmh]);

  // Toma la ubicación del dispositivo como punto de partida (sin que el usuario la escriba)
  const usarMiUbicacion = async (silencioso = false) => {
    try {
      const posicion = await obtenerUbicacionActual();
      setPuntoInicio({ posicion, direccion: 'Mi ubicación actual', tipo: 'inicio' });
      if (!silencioso) mostrarAviso('📍 Usando tu ubicación como inicio', 'exito');
    } catch {
      mostrarAviso('No pudimos obtener tu ubicación. Actívala o márcala en el mapa.', 'info');
    }
  };

  // Al abrir la app: ubicación inicial automática (una sola vez)
  const ubicacionSolicitada = useRef(false);
  useEffect(() => {
    if (ubicacionSolicitada.current) return;
    ubicacionSolicitada.current = true;
    usarMiUbicacion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manejarClicMapa = (latitud: number, longitud: number) => {
    if (modoClic === 'inicio') {
      setPuntoInicio({ posicion: { latitud, longitud }, tipo: 'inicio' });
      setModoClic(null);
    } else if (modoClic === 'destino') {
      setPuntoDestino({ posicion: { latitud, longitud }, tipo: 'destino' });
      setModoClic(null);
    }
  };

  const manejarLimpiar = () => {
    setPuntoDestino(null); setModoClic(null); // el inicio siempre es la ubicación del usuario
  };

  const manejarAlternarGuardado = (id: string) => {
    setRutasGuardadas(anterior => {
      const siguiente = new Set(anterior);
      if (siguiente.has(id)) { siguiente.delete(id); mostrarAviso('Ruta eliminada de guardados', 'info'); }
      else              { siguiente.add(id);    mostrarAviso('⭐ Ruta guardada', 'exito'); }
      return siguiente;
    });
  };

  const manejarIniciarRuta = (ruta: RutaCiclista) => {
    setSegundos(0);
    setRutaActiva(ruta);
    setRutaSeleccionada(ruta);
    // Traza el tramo desde tu ubicación hasta el final de la ruta (con seguridad y tiempo estimado)
    const ultimo = ruta.coordenadas[ruta.coordenadas.length - 1];
    setPuntoDestino({ posicion: ultimo, direccion: ruta.nombre, tipo: 'destino' });
    mostrarAviso(`🚴 Iniciaste: ${ruta.nombre}`, 'exito');
  };

  const manejarAbrirReporte = (idRuta?: string) => {
    setRutaObjetivoReporte(idRuta);
    setReporteAbierto(true);
  };

  const manejarEnvioReporte = (parcial: Omit<ReporteIncidente, 'id' | 'creadoEn'>) => {
    const reporte: ReporteIncidente = {
      ...parcial,
      id: `inc-${Date.now()}`,
      creadoEn: new Date().toISOString(),
    };
    setIncidentes(anterior => [...anterior, reporte]);
    setReporteAbierto(false);
    mostrarAviso('⚠️ Reporte enviado. ¡Gracias por ayudar!', 'exito');
  };

  const manejarFinalizarRuta = () => { setSegundosFinal(segundos); setFinalizarAbierto(true); };

  const manejarEnvioCalificacion = (calificacion: number, impresiones: string[], comentario: string) => {
    if (!rutaActiva) return;
    setRutas(anterior => anterior.map(r => {
      if (r.id !== rutaActiva.id) return r;
      const nuevaResena = comentario ? [{ calificacion, comentario, impresiones, creadoEn: new Date().toISOString() }] : [];
      return { ...r, calificaciones: [...r.calificaciones, calificacion], resenas: [...r.resenas, ...nuevaResena] };
    }));
    setFinalizarAbierto(false);
    setRutaActiva(null);
    mostrarAviso('✅ ¡Gracias por tu reseña!', 'exito');
  };

  const manejarSuscripcion = (plan: TipoPlan) => {
    setCuenta({
      nombre: 'Usuario Pro',
      plan,
      diasPruebaRestantes: 0,
      esPremium: true,
    });
    mostrarAviso('🎉 ¡Bienvenido a Ciclo Rutas Pro! Sin publicidad 🚀', 'exito');
  };

  // ── Contenido de la barra lateral ───────────────────────────────────────
  const listaGuardadas = rutas.filter(r => rutasGuardadas.has(r.id));

  const renderizarListaRutas = (lista: RutaCiclista[]) => (
    <>
      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛣️</div>
          <p>No hay rutas con este filtro</p>
        </div>
      ) : lista.map(r => (
        <TarjetaRuta
          key={r.id}
          ruta={r}
          estaSeleccionada={rutaSeleccionada?.id === r.id}
          estaGuardada={rutasGuardadas.has(r.id)}
          alSeleccionar={() => manejarSeleccionRuta(r)}
          alGuardar={() => manejarAlternarGuardado(r.id)}
          alIniciar={() => manejarIniciarRuta(r)}
          alReportar={() => manejarAbrirReporte(r.id)}
          velocidadKmh={velocidadKmh}
        />
      ))}
    </>
  );

  const todasCalificaciones     = rutas.flatMap(r => r.calificaciones);
  const promedioGlobal      = todasCalificaciones.length
    ? (todasCalificaciones.reduce((a, b) => a + b, 0) / todasCalificaciones.length).toFixed(1)
    : '—';
  const kmTotales        = rutas.reduce((a, r) => a + r.distancia, 0).toFixed(1);

  return (
    <div className="app-raiz" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

      {/* ── Banner freemium ──────────────────────────────────── */}
      <BannerPrueba
        cuenta={cuenta}
        alSuscribirse={() => setSuscripcionAbierta(true)}
      />

      {/* ── Banner de publicidad (solo en prueba) ───────────────────────────── */}
      {!cuenta.esPremium && (
        <div className="banner-publicidad" style={{
          background: '#0e1118',
          borderBottom: '1px solid var(--border)',
          padding: '6px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontSize: 12,
          color: 'var(--muted)',
        }}>
          <span style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 4,
            padding: '1px 6px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Publicidad
          </span>
          <span className="publicidad-texto">🛒 Equípate para tu próxima ruta —</span>{' '}
          <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Bicicletas Bogotá · Ver ofertas →
          </a>
          <button
            onClick={() => setSuscripcionAbierta(true)}
            style={{
              marginLeft: 8,
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 11,
              color: 'var(--muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Quitar anuncios
          </button>
        </div>
      )}

      {/* ── Encabezado ───────────────────────────────────────────── */}
      <header className="encabezado" style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div className="encabezado-marca" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'var(--green)',
            color: '#000',
            width: 34, height: 34,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}>🚴</div>
          <div style={{ minWidth: 0 }}>
            <div className="encabezado-titulo" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.4px' }}>
              Ciclo Rutas Seguras
            </div>
            <div className="encabezado-subtitulo" style={{ fontSize: 11, color: 'var(--muted)' }}>
              Bogotá · Rutas seguras para ciclistas
            </div>
          </div>
        </div>

        <div className="encabezado-acciones" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DescargarApp />
          {incidentes.length > 0 && (
            <span style={{
              background: 'var(--red-dim)',
              border: '1px solid rgba(255,71,87,0.35)',
              color: 'var(--red)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
            }}>
              ⚠️ {incidentes.length} reporte{incidentes.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            className="encabezado-cuenta"
            onClick={() => setSuscripcionAbierta(true)}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '6px 14px 6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              color: 'var(--text)',
            }}
          >
            <div style={{
              width: 26, height: 26, flexShrink: 0,
              background: cuenta.esPremium ? 'var(--green)' : 'var(--accent)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: '#fff',
            }}>
              {cuenta.esPremium ? '★' : 'U'}
            </div>
            <span className="encabezado-nombre" style={{ fontSize: 13, fontWeight: 600 }}>{cuenta.nombre}</span>
          </button>
          {alCerrarSesion && (
            <button
              className="encabezado-salir"
              onClick={alCerrarSesion}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              style={{
                background: 'var(--red-dim)', border: '1px solid rgba(255,71,87,0.35)', borderRadius: 20,
                padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--red)', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              ⏻ Salir
            </button>
          )}
        </div>
      </header>

      {/* ── Cuerpo ─────────────────────────────────────────────── */}
      <div className="app-cuerpo" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Barra lateral ──────────────────────────────────────── */}
        <aside className="app-lateral" style={{
          width: 'clamp(300px, 28vw, 420px)',
          background: 'var(--bg2)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Barra de pestañas */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            padding: '10px 14px 0',
            gap: 2,
          }}>
            {(['planificar', 'rutas', 'guardadas', 'estadisticas'] as PestanaLateral[]).map(pestana => {
              const etiquetas: Record<PestanaLateral, string> = {
                planificar: '🗺️ Planificar',
                rutas: '🛣️ Rutas',
                guardadas: `⭐ Guardadas${rutasGuardadas.size ? ` (${rutasGuardadas.size})` : ''}`,
                estadisticas: '📊 Stats',
              };
              return (
                <button
                  key={pestana}
                  onClick={() => setPestanaActiva(pestana)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    fontSize: 12,
                    fontWeight: pestanaActiva === pestana ? 700 : 400,
                    color: pestanaActiva === pestana ? 'var(--text)' : 'var(--muted)',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${pestanaActiva === pestana ? 'var(--green)' : 'transparent'}`,
                    marginBottom: -1,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                    borderRadius: '6px 6px 0 0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {etiquetas[pestana]}
                </button>
              );
            })}
          </div>

          {/* Contenido */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {pestanaActiva === 'planificar' && (
              <PlanificadorRuta
                puntoInicio={puntoInicio}
                puntoDestino={puntoDestino}
                alFijarDestino={setPuntoDestino}
                alLimpiar={manejarLimpiar}
                alCambiarModoClic={setModoClic}
                alUsarMiUbicacion={() => usarMiUbicacion()}
                velocidadKmh={velocidadKmh}
                alCambiarVelocidad={setVelocidadKmh}
                modoClic={modoClic}
              />
            )}

            {pestanaActiva === 'rutas' && (
              <>
                <PanelFiltros seguridadSeleccionada={filtroSeguridad} alCambiarSeguridad={setFiltroSeguridad} />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  {rutasFiltradas.length} ruta{rutasFiltradas.length !== 1 ? 's' : ''} disponible{rutasFiltradas.length !== 1 ? 's' : ''}
                </div>
                {renderizarListaRutas(rutasFiltradas)}
              </>
            )}

            {pestanaActiva === 'guardadas' && (
              listaGuardadas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>☆</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text2)' }}>
                    Sin rutas guardadas
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Guarda tus rutas favoritas desde la pestaña <strong style={{ color: 'var(--text)' }}>Rutas</strong>
                  </div>
                </div>
              ) : renderizarListaRutas(listaGuardadas)
            )}

            {pestanaActiva === 'estadisticas' && (
              <PanelEstadisticas rutas={rutas} promedioGlobal={promedioGlobal} kmTotales={kmTotales} incidentes={incidentes} />
            )}
          </div>
        </aside>

        {/* ── Mapa ──────────────────────────────────────────── */}
        <main className="app-mapa" style={{ flex: 1, position: 'relative' }}>
          <MapaCiclista
            rutas={rutasFiltradas}
            rutaSeleccionada={rutaSeleccionada}
            marcadores={marcadoresMapa}
            puntoInicio={puntoInicio}
            puntoDestino={puntoDestino}
            alClicMapa={manejarClicMapa}
            modoClic={modoClic}
            seguridadPlanificada={seguridadPlanificada}
            rutaActiva={rutaActiva}
          />

          {/* Aviso de seguridad del trazado — aparece apenas hay inicio y destino */}
          {seguridadPlanificada && !avisoCerrado && (
            <div className="app-aviso-seguridad" style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
              background: 'rgba(22,27,38,0.95)',
              border: `1px solid ${colorSeguridad(seguridadPlanificada.nivel)}`,
              borderRadius: 'var(--radius-lg)',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-md)',
              backdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.25s ease',
              maxWidth: 480,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: colorSeguridad(seguridadPlanificada.nivel),
                display: 'grid', placeItems: 'center', fontSize: 17,
              }}>
                {seguridadPlanificada.nivel === 'segura' ? '✅' : seguridadPlanificada.nivel === 'moderada' ? '⚠️' : '🚫'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colorSeguridad(seguridadPlanificada.nivel) }}>
                  Ruta {etiquetaSeguridad(seguridadPlanificada.nivel).toLowerCase()}
                  {tiempoPlanificado && <span style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}> · ⏱️ {formatearDuracion(tiempoPlanificado.minutos)} · {formatearDistancia(tiempoPlanificado.distanciaKm)}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.35 }}>
                  {seguridadPlanificada.motivo}
                </div>
              </div>
              <button
                onClick={() => setAvisoCerrado(true)}
                aria-label="Cerrar aviso"
                title="Cerrar"
                style={{
                  flexShrink: 0, alignSelf: 'flex-start', marginLeft: 4,
                  width: 26, height: 26, borderRadius: '50%',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--muted)', fontSize: 14, lineHeight: 1, cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Panel flotante de estadísticas */}
          <div className="app-stats-flotante" style={{
            position: 'absolute', bottom: 20, left: 20, zIndex: 500,
            background: 'rgba(22,27,38,0.92)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            backdropFilter: 'blur(8px)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>
              Red de Rutas
            </div>
            {[
              { icono: '✅', etiqueta: 'Seguras',    cantidad: rutas.filter(r => r.nivelSeguridad === 'segura').length },
              { icono: '⚠️', etiqueta: 'Moderadas',  cantidad: rutas.filter(r => r.nivelSeguridad === 'moderada').length },
              { icono: '🚫', etiqueta: 'Peligrosas', cantidad: rutas.filter(r => r.nivelSeguridad === 'peligrosa').length },
            ].map(({ icono, etiqueta, cantidad }) => (
              <div key={etiqueta} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                <span>{icono} {etiqueta}</span>
                <strong style={{ color: 'var(--text)' }}>{cantidad}</strong>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
              <span>📍 Puntos de interés</span>
              <strong style={{ color: 'var(--text)' }}>{marcadoresMapa.length}</strong>
            </div>
          </div>

          {/* Instrucción: ya tenemos tu ubicación, falta el destino */}
          {puntoInicio && !puntoDestino && !modoClic && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
              background: 'rgba(14,17,24,0.95)', border: '1px solid var(--border-hover)',
              color: 'var(--text)', borderRadius: 20, padding: '8px 18px',
              fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-md)',
              animation: 'fadeIn 0.25s ease', whiteSpace: 'nowrap',
            }}>
              👋 Partes desde tu ubicación · ¿A dónde vas?
            </div>
          )}

          {/* Indicador del modo de clic */}
          {modoClic && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
              background: modoClic === 'inicio' ? 'var(--green)' : 'var(--red)',
              color: modoClic === 'inicio' ? '#000' : '#fff',
              borderRadius: 20,
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: 'var(--shadow-md)',
              animation: 'fadeIn 0.2s ease',
            }}>
              {modoClic === 'inicio' ? '📍 Haz clic para marcar el inicio' : '🎯 Haz clic para marcar el destino'}
            </div>
          )}
        </main>
      </div>

      {/* ── Barra de ruta activa ─────────────────────────────────── */}
      {rutaActiva && (
        <div style={{
          background: 'rgba(0,200,150,0.1)',
          borderTop: '1px solid rgba(0,200,150,0.3)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🚴</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{rutaActiva.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rutaActiva.distancia} km · ⏱️ {formatearCronometro(segundos)} <span style={{ opacity: 0.8 }}>(estimado {formatearDuracion(minutosPorDistancia(rutaActiva.distancia, velocidadKmh))})</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => manejarAbrirReporte(rutaActiva.id)}
              style={{
                background: 'rgba(255,71,87,0.1)',
                border: '1px solid rgba(255,71,87,0.3)',
                color: 'var(--red)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              ⚠️ Reportar incidente
            </button>
            <button
              onClick={manejarFinalizarRuta}
              style={{
                background: 'var(--green)',
                color: '#000',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                animation: 'pulseGreen 2s infinite',
              }}
            >
              🏁 Terminé la ruta
            </button>
          </div>
        </div>
      )}

      {/* ── Ventanas modales ───────────────────────────────────────────── */}
      <ModalFinalizarRuta
        abierto={finalizarAbierto}
        ruta={rutaActiva}
        tiempoReal={formatearCronometro(segundosFinal)}
        alCerrar={() => setFinalizarAbierto(false)}
        alEnviar={manejarEnvioCalificacion}
      />

      <ModalReporte
        abierto={reporteAbierto}
        alCerrar={() => setReporteAbierto(false)}
        alEnviar={manejarEnvioReporte}
        idRuta={rutaObjetivoReporte}
      />

      <ModalSuscripcion
        abierto={suscripcionAbierta}
        alCerrar={() => setSuscripcionAbierta(false)}
        alSuscribirse={manejarSuscripcion}
        cuenta={cuenta}
      />
    </div>
  );
}

// ── Trial / Premium Banner ────────────────────────────────────
function BannerPrueba({ cuenta, alSuscribirse }: { cuenta: CuentaUsuario; alSuscribirse: () => void }) {
  const esPremium = cuenta.esPremium;
  return (
    <div className="banner-prueba" style={{
      background: esPremium
        ? 'linear-gradient(90deg, #001a0f, #002a17, #001a0f)'
        : 'linear-gradient(90deg, #1a1200, #2a1e00, #1a1200)',
      borderBottom: `1px solid ${esPremium ? 'rgba(0,200,150,0.3)' : 'rgba(255,177,66,0.3)'}`,
      padding: '6px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 12,
      color: esPremium ? 'var(--green)' : 'var(--amber)',
      gap: 10,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="banner-marca" style={{ fontWeight: 700 }}>{esPremium ? '⭐ Ciclo Rutas Pro' : '🚴 Ciclo Rutas'}</span>
        <span style={{
          background: esPremium ? 'rgba(0,200,150,0.15)' : 'rgba(255,177,66,0.15)',
          border: `1px solid ${esPremium ? 'rgba(0,200,150,0.4)' : 'rgba(255,177,66,0.4)'}`,
          borderRadius: 20,
          padding: '1px 10px',
          fontWeight: 700,
          fontSize: 11,
        }}>
          {esPremium ? '✅ Suscripción Activa' : `Prueba gratis: ${cuenta.diasPruebaRestantes} días restantes`}
        </span>
        <span className="banner-detalle" style={{ color: esPremium ? 'rgba(0,200,150,0.7)' : 'rgba(255,177,66,0.6)', fontSize: 11 }}>
          {esPremium ? 'Sin publicidad · Acceso completo' : 'Acceso a todas las rutas · Con publicidad'}
        </span>
      </div>
      {!esPremium && (
        <button
          onClick={alSuscribirse}
          style={{
            background: 'var(--amber)',
            color: '#1a1000',
            border: 'none',
            borderRadius: 20,
            padding: '4px 16px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          ⭐ Suscribirse
        </button>
      )}
    </div>
  );
}

// ── Panel de estadísticas ───────────────────────────────────────────────
function PanelEstadisticas({ rutas, promedioGlobal, kmTotales, incidentes }: {
  rutas: RutaCiclista[];
  promedioGlobal: string;
  kmTotales: string;
  incidentes: ReporteIncidente[];
}) {
  return (
    <div style={{ animation: 'fadeIn 0.25s ease both' }}>
      {/* Cuadrícula de resumen */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 12 }}>
        Resumen de Red
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { n: rutas.filter(r => r.nivelSeguridad === 'segura').length,      etiqueta: 'Rutas seguras',   color: 'var(--green)' },
          { n: rutas.filter(r => r.nivelSeguridad === 'moderada').length,  etiqueta: 'Moderadas',       color: 'var(--amber)' },
          { n: rutas.filter(r => r.nivelSeguridad === 'peligrosa').length, etiqueta: 'Peligrosas',      color: 'var(--red)' },
          { n: kmTotales,                                                    etiqueta: 'Km totales',      color: 'var(--accent)' },
        ].map(({ n, etiqueta, color }) => (
          <div key={etiqueta} style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color }}>{n}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{etiqueta}</div>
          </div>
        ))}
      </div>

      {/* Promedio global */}
      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Calificación promedio</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {rutas.flatMap(r => r.calificaciones).length} reseñas en total
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--amber)' }}>
          {promedioGlobal} ⭐
        </div>
      </div>

      {/* Por ruta */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>
        Por Ruta
      </div>
      {rutas.map(r => (
        <div key={r.id} style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {r.calificaciones.length} reseña{r.calificaciones.length !== 1 ? 's' : ''} · {r.distancia} km
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--amber)', fontWeight: 700 }}>
            {promedioCalificacion(r) ? `${formatearCalificacion(r)} ⭐` : '—'}
          </div>
        </div>
      ))}

      {/* Incidentes */}
      {incidentes.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '20px 0 10px' }}>
            Reportes recientes
          </div>
          {incidentes.slice(-5).reverse().map(incidente => (
            <div key={incidente.id} style={{
              background: 'var(--red-dim)',
              border: '1px solid rgba(255,71,87,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 8,
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>⚠️ {incidente.tipo}</div>
              {incidente.ubicacion && <div style={{ color: 'var(--muted)' }}>📍 {incidente.ubicacion}</div>}
              {incidente.descripcion && <div style={{ color: 'var(--text2)', marginTop: 4 }}>{incidente.descripcion}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}