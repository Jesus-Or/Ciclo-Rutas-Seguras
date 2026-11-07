import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer, TileLayer, Polyline, Marker, Popup,
  useMap, useMapEvents,
} from 'react-leaflet';
import { LatLngBounds, LeafletMouseEvent } from 'leaflet';
import { RutaCiclista, MarcadorMapa, PuntoRuta, Coordenada, RutaCalculada } from '../types';
import { colorSeguridad, etiquetaSeguridad, EstimacionSeguridadRuta } from '../utils';
import { formatearMetros, distanciaMetros } from '../enrutamiento';
import { usePuntosApoyo } from '../puntosApoyo';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrige el ícono por defecto de Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25,41], iconAnchor: [12,41] });

// ── Íconos ───────────────────────────────────────────────────────────────
function iconoCirculo(fondo: string, emoji: string, tam = 32) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${fondo};width:${tam}px;height:${tam}px;border-radius:50%;
      border:3px solid rgba(255,255,255,0.85);
      box-shadow:0 2px 10px rgba(0,0,0,0.45);
      display:grid;place-items:center;font-size:${Math.round(tam * 0.47)}px;
    ">${emoji}</div>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
  });
}

// Bicicleta (se reutiliza en las dos poses del avatar)
const SVG_BICI = `
  <g fill="none" stroke="#2f3a5a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="14" cy="34" r="10"/><circle cx="50" cy="34" r="10"/>
    <path d="M14 34 L28 34 L24 20 M24 20 L42 20 L28 34 M42 20 L50 34 M42 20 L42 14 L47 14 M21 18 L27 18"/>
  </g>
  <g class="avatar-ruedas" fill="none" stroke="#5f7fff" stroke-width="1.6" stroke-linecap="round">
    <path d="M14 26 V42 M6 34 H22 M50 26 V42 M42 34 H58"/>
  </g>`;


// Avatar parado junto a su bici, saludando
function iconoAvatarParado(etiqueta: string) {
  return L.divIcon({
    className: 'avatar-mov',
    html: `<div class="avatar-contenedor">
      <div class="pin-etiqueta">${etiqueta}</div>
      <svg class="avatar-svg" width="62" height="38" viewBox="0 0 92 56">
        <g transform="translate(34,12) scale(0.8)">${SVG_BICI}</g>
        <g stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="11" r="6" fill="#ffd7a8"/>
          <path d="M6 9 Q12 0 18 9 Z" fill="#00c896"/>
          <path d="M12 17 V35" stroke="#00c896" stroke-width="5" fill="none"/>
          <path d="M12 35 L7 50 M12 35 L17 50" stroke="#2f3a5a" stroke-width="4" fill="none"/>
          <path class="avatar-saludo" d="M12 21 L22 12" stroke="#ffd7a8" stroke-width="3.5" fill="none"/>
        </g>
      </svg>
    </div>`,
    iconSize: [62, 58],
    iconAnchor: [31, 52],
  });
}

// Avatar montado en la bici, pedaleando
function iconoAvatarRodando(izquierda: boolean) {
  return L.divIcon({
    className: 'avatar-mov',
    html: `<div class="avatar-contenedor avatar-sube">
      <svg class="avatar-svg ${izquierda ? 'avatar-izq' : ''}" width="72" height="56" viewBox="0 0 64 48">
        ${SVG_BICI}
        <g stroke-linecap="round" stroke-linejoin="round">
          <circle cx="31" cy="6" r="5" fill="#ffd7a8"/>
          <path d="M26 5 Q31 -3 36 5 Z" fill="#00c896"/>
          <path d="M26 18 L32 9" stroke="#00c896" stroke-width="5" fill="none"/>
          <path d="M32 11 L44 15" stroke="#ffd7a8" stroke-width="3" fill="none"/>
          <path class="avatar-pierna" d="M26 18 L33 28 L29 35" stroke="#2f3a5a" stroke-width="4" fill="none"/>
        </g>
      </svg>
    </div>`,
    iconSize: [72, 56],
    iconAnchor: [36, 46],
  });
}

// Marcador de destino: cuadrado oscuro con etiqueta "Destino"
function iconoDestino() {
  return L.divIcon({
    className: 'pin-contenedor',
    html: `<div class="pin-etiqueta pin-etiqueta-destino">Destino</div>
           <div class="pin-punto"><span class="pin-cuadro"><span class="pin-cuadro-interno"></span></span></div>`,
    iconSize: [140, 64],
    iconAnchor: [70, 52],
  });
}

const mapaIconosMarcadores: Record<string, { fondo: string; emoji: string }> = {
  parqueadero: { fondo: '#5f7fff', emoji: '🅿' },
  taller:  { fondo: '#a855f7', emoji: '🔧' },
  peligro:  { fondo: '#ff4757', emoji: '⚠️' },
  interes:     { fondo: '#00c896', emoji: '📍' },
  incidente:{ fondo: '#ff8c00', emoji: '🚨' },
};

const aLatLng = (p: Coordenada): [number, number] => [p.latitud, p.longitud];

// ── Ayudantes del mapa (hooks dentro de MapContainer) ───────────────────
function ActualizadorMapa({ rutas, inicio, rutaActiva, rutaPlanificada, seguirUsuario }: {
  rutas: RutaCiclista[];
  inicio: PuntoRuta | null;
  rutaActiva: RutaCiclista | null;
  rutaPlanificada: RutaCalculada | null;
  seguirUsuario: boolean;
}) {
  const map = useMap();
  const latitudInicio = inicio?.posicion.latitud;
  const longitudInicio = inicio?.posicion.longitud;

  useEffect(() => {
    const contenedor = map.getContainer();
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, [map]);

  // 1. Primera ubicación: centra el mapa. Después solo te sigue durante una ruta en curso.
  const centradoInicial = useRef(false);
  const seguirRef = useRef(seguirUsuario);
  seguirRef.current = seguirUsuario;
  useEffect(() => {
    if (latitudInicio === undefined || longitudInicio === undefined) return;
    if (!centradoInicial.current) {
      centradoInicial.current = true;
      map.setView([latitudInicio, longitudInicio], Math.max(map.getZoom(), 14));
    } else if (seguirRef.current) {
      map.panTo([latitudInicio, longitudInicio], { animate: true, duration: 0.9, easeLinearity: 1 });
    }
  }, [latitudInicio, longitudInicio, map]);

  // 2. Sin ubicación: se muestra la red de rutas (una sola vez)
  const ajusteInicialHecho = useRef(false);
  useEffect(() => {
    if (ajusteInicialHecho.current || latitudInicio !== undefined || !rutas.length) return;
    ajusteInicialHecho.current = true;
    const todas = rutas.flatMap(r => r.coordenadas);
    if (todas.length) map.fitBounds(new LatLngBounds(todas.map(aLatLng)), { padding: [40, 40] });
  }, [rutas, latitudInicio, map]);

  // 3. Al iniciar una ruta se muestra tu ubicación junto con la ruta elegida
  const idRutaActiva = rutaActiva?.id;
  useEffect(() => {
    if (!rutaActiva?.coordenadas.length) return;
    const puntos: [number, number][] = rutaActiva.coordenadas.map(aLatLng);
    if (latitudInicio !== undefined && longitudInicio !== undefined) puntos.push([latitudInicio, longitudInicio]);
    map.fitBounds(new LatLngBounds(puntos), { padding: [70, 70] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRutaActiva, map]);

  // 4. Ruta planificada: se encuadra completa (no mientras te sigue)
  useEffect(() => {
    if (!rutaPlanificada?.coordenadas.length || seguirRef.current) return;
    map.fitBounds(new LatLngBounds(rutaPlanificada.coordenadas.map(aLatLng)), { padding: [70, 70] });
  }, [rutaPlanificada, map]);

  return null;
}

// Botón para volver a centrar el mapa en la ubicación del usuario
function BotonMiUbicacion({ inicio }: { inicio: PuntoRuta | null }) {
  const map = useMap();
  if (!inicio) return null;
  return (
    <button
      className="boton-mi-ubicacion"
      onClick={(e) => {
        e.stopPropagation();
        map.setView([inicio.posicion.latitud, inicio.posicion.longitud], Math.max(map.getZoom(), 15));
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label="Volver a mi ubicación"
      title="Volver a mi ubicación"
      style={{
        position: 'absolute', right: 12, bottom: 24, zIndex: 1000,
        width: 44, height: 44, borderRadius: '50%',
        border: '1px solid var(--border)', background: 'rgba(22,27,38,0.95)',
        color: 'var(--text)', fontSize: 20, cursor: 'pointer',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      📍
    </button>
  );
}

function ManejadorClics({ modo, alClicMapa }: {
  modo: 'inicio' | 'destino' | null;
  alClicMapa: (latitud: number, longitud: number) => void;
}) {
  useMapEvents({
    click: (e: LeafletMouseEvent) => { if (modo) alClicMapa(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Avatar del ciclista: parado junto a la bici o montado y rodando
function AvatarCiclista({ inicio, rodando, hayDestino, alTocar }: {
  inicio: PuntoRuta;
  rodando: boolean;
  hayDestino: boolean;
  alTocar?: () => void;
}) {
  const lat = inicio.posicion.latitud;
  const lon = inicio.posicion.longitud;

  // Hacia dónde mira: se voltea según avances al este u oeste
  const [izquierda, setIzquierda] = useState(false);
  const lonAnterior = useRef(lon);
  useEffect(() => {
    const dif = lon - lonAnterior.current;
    if (Math.abs(dif) > 0.00003) setIzquierda(dif < 0);
    lonAnterior.current = lon;
  }, [lon]);

  const etiqueta = hayDestino ? '¡Súbete! 🚲' : 'Estás aquí';
  const iconoParado = useMemo(() => iconoAvatarParado(etiqueta), [etiqueta]);
  const iconoRodando = useMemo(() => iconoAvatarRodando(izquierda), [izquierda]);

  return (
    <Marker
      position={[lat, lon]}
      icon={rodando ? iconoRodando : iconoParado}
      zIndexOffset={1000}
      eventHandlers={{ click: () => { if (!rodando) alTocar?.(); } }}
    />
  );
}

// ── Componente principal ────────────────────────────────────────────
interface PropiedadesMapaCiclista {
  rutas: RutaCiclista[];
  rutaSeleccionada: RutaCiclista | null;
  marcadores: MarcadorMapa[];
  puntoInicio: PuntoRuta | null;
  puntoDestino: PuntoRuta | null;
  alClicMapa: (latitud: number, longitud: number) => void;
  modoClic: 'inicio' | 'destino' | null;
  seguridadPlanificada: EstimacionSeguridadRuta | null;
  rutaActiva?: RutaCiclista | null;
  seguirUsuario?: boolean;
  /** Ruta real por calles entre inicio y destino (calcularRutaReal) */
  rutaPlanificada?: RutaCalculada | null;
  /** Rutas predefinidas ajustadas a las calles (useRutasSobreVias) */
  coordenadasAjustadas?: Record<string, Coordenada[]>;
  /** Al tocar el avatar parado (para subirse a la bici e iniciar) */
  alTocarAvatar?: () => void;
}

export function MapaCiclista({
  rutas, rutaSeleccionada, marcadores, puntoInicio, puntoDestino, alClicMapa, modoClic,
  seguridadPlanificada, rutaActiva = null, seguirUsuario = false,
  rutaPlanificada = null, coordenadasAjustadas = {}, alTocarAvatar,
}: PropiedadesMapaCiclista) {
  const colorPlanificada = seguridadPlanificada ? colorSeguridad(seguridadPlanificada.nivel) : '#5f7fff';

  // CAI y hospitales cerca de ti (referencias de apoyo)
  const puntosApoyo = usePuntosApoyo(puntoInicio?.posicion ?? null);

  return (
    <MapContainer
      center={[4.6560, -74.0660]}
      zoom={13}
      style={{
        height: '100%',
        width: '100%',
        cursor: modoClic ? 'crosshair' : 'grab',
      }}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ActualizadorMapa
        rutas={rutas}
        inicio={puntoInicio}
        rutaActiva={rutaActiva}
        rutaPlanificada={rutaPlanificada}
        seguirUsuario={seguirUsuario}
      />
      <BotonMiUbicacion inicio={puntoInicio} />
      <ManejadorClics modo={modoClic} alClicMapa={alClicMapa} />

      {/* ── Rutas predefinidas (ajustadas a las calles cuando ya están calculadas) ── */}
      {rutas.map(ruta => {
        const estaActivo = rutaSeleccionada?.id === ruta.id;
        const coordenadas = coordenadasAjustadas[ruta.id] ?? ruta.coordenadas;
        return (
          <Polyline
            key={ruta.id}
            positions={coordenadas.map(aLatLng)}
            color={colorSeguridad(ruta.nivelSeguridad)}
            weight={estaActivo ? 7 : 4}
            opacity={rutaSeleccionada ? (estaActivo ? 1 : 0.2) : 0.72}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', minWidth: 180 }}>
                <strong style={{ fontSize: 14 }}>{ruta.nombre}</strong>
                <br />
                <span style={{ fontSize: 12, color: '#aaa' }}>{ruta.descripcion}</span>
                <br />
                <em style={{ fontSize: 12 }}>📏 {ruta.distancia} km</em>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* ── POI marcadores ────────────────────────────────────── */}
      {marcadores.map(m => {
        const configuracion = mapaIconosMarcadores[m.tipo] ?? mapaIconosMarcadores.interes;
        return (
          <Marker key={m.id} position={aLatLng(m.posicion)} icon={iconoCirculo(configuracion.fondo, configuracion.emoji)}>
            <Popup><strong>{m.titulo}</strong></Popup>
          </Marker>
        );
      })}

      {/* ── CAI y hospitales cercanos ─────────────────────────── */}
      {puntosApoyo.map(p => (
        <Marker
          key={p.id}
          position={aLatLng(p.posicion)}
          icon={p.tipo === 'cai' ? iconoCirculo('#2f6bff', '🚓', 28) : iconoCirculo('#e5384b', '🏥', 28)}
        >
          <Popup>
            <strong>{p.tipo === 'cai' ? '🚓 ' : '🏥 '}{p.nombre}</strong>
            {puntoInicio && (
              <>
                <br />
                <span style={{ fontSize: 12 }}>A {formatearMetros(distanciaMetros(puntoInicio.posicion, p.posicion))} de ti</span>
              </>
            )}
          </Popup>
        </Marker>
      ))}

      {/* ── Avatar del ciclista (inicio) ─────────────────────────── */}
      {puntoInicio && (
        <AvatarCiclista
          inicio={puntoInicio}
          rodando={Boolean(rutaActiva)}
          hayDestino={Boolean(puntoDestino)}
          alTocar={alTocarAvatar}
        />
      )}

      {/* ── Marcador de destino ─────────────────────────────────────── */}
      {puntoDestino && (
        <Marker position={aLatLng(puntoDestino.posicion)} icon={iconoDestino()} zIndexOffset={1000}>
          <Popup>
            <strong>🎯 Destino</strong>
            {puntoDestino.direccion && <><br />{puntoDestino.direccion}</>}
          </Popup>
        </Marker>
      )}

      {/* ── Ruta real por las calles (borde blanco + línea de color) ── */}
      {rutaPlanificada && rutaPlanificada.coordenadas.length > 1 && (
        <>
          <Polyline
            positions={rutaPlanificada.coordenadas.map(aLatLng)}
            color="#ffffff"
            weight={10}
            opacity={0.85}
            interactive={false}
          />
          <Polyline
            positions={rutaPlanificada.coordenadas.map(aLatLng)}
            color={colorPlanificada}
            weight={6}
            opacity={0.95}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', minWidth: 200 }}>
                <strong>
                  Ruta planificada
                  {seguridadPlanificada && ` · ${etiquetaSeguridad(seguridadPlanificada.nivel)}`}
                </strong>
                <br />
                <span style={{ fontSize: 12 }}>📏 {formatearMetros(rutaPlanificada.distanciaMetros)}</span>
                {seguridadPlanificada && (
                  <>
                    <br />
                    <span style={{ fontSize: 12, color: '#aaa' }}>{seguridadPlanificada.motivo}</span>
                  </>
                )}
              </div>
            </Popup>
          </Polyline>
        </>
      )}
    </MapContainer>
  );
}