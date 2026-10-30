import { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, Polyline, Marker, Popup,
  useMap, useMapEvents,
} from 'react-leaflet';
import { LatLngBounds, LeafletMouseEvent } from 'leaflet';
import { RutaCiclista, MarcadorMapa, PuntoRuta } from '../types';
import { colorSeguridad, etiquetaSeguridad, EstimacionSeguridadRuta } from '../utils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrige el ícono por defecto de Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25,41], iconAnchor: [12,41] });

// ── Funciones auxiliares ───────────────────────────────────────────────────
function iconoCirculo(fondo: string, emoji: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${fondo};width:32px;height:32px;border-radius:50%;
      border:3px solid rgba(255,255,255,0.85);
      box-shadow:0 2px 10px rgba(0,0,0,0.45);
      display:grid;place-items:center;font-size:15px;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Marcador de inicio estilo apps de transporte (Yango/Uber): punto azul pulsante + etiqueta "Estás aquí"
function iconoInicio() {
  return L.divIcon({
    className: 'pin-contenedor',
    html: `<div class="pin-etiqueta">Estás aquí</div>
           <div class="pin-punto"><span class="pin-pulso"></span><span class="pin-nucleo"></span></div>`,
    iconSize: [140, 64],
    iconAnchor: [70, 52],
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

// ── Ayudantes del mapa (hooks dentro de MapContainer) ───────────────────
function ActualizadorMapa({ rutas, inicio, rutaActiva, seguirUsuario }: {
  rutas: RutaCiclista[];
  inicio: PuntoRuta | null;
  rutaActiva: RutaCiclista | null;
  seguirUsuario: boolean;
}) {
  const map = useMap();
  const latitudInicio = inicio?.posicion.latitud;
  const longitudInicio = inicio?.posicion.longitud;

  // El mapa se redibuja bien cuando cambia de tamaño (por ejemplo, al ocultar el panel en celular)
  useEffect(() => {
    const contenedor = map.getContainer();
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, [map]);

  // 1. Con la primera ubicación el mapa se centra en ti. Después NO se mueve solo
  //    (filtrar rutas o planificar no lo mueven), salvo durante una ruta en curso: ahí te sigue.
  const centradoInicial = useRef(false);
  const seguirRef = useRef(seguirUsuario);
  seguirRef.current = seguirUsuario;
  useEffect(() => {
    if (latitudInicio === undefined || longitudInicio === undefined) return;
    if (!centradoInicial.current) {
      centradoInicial.current = true;
      map.setView([latitudInicio, longitudInicio], Math.max(map.getZoom(), 14));
    } else if (seguirRef.current) {
      map.panTo([latitudInicio, longitudInicio], { animate: true });
    }
  }, [latitudInicio, longitudInicio, map]);

  // 2. Si todavía no hay ubicación, se muestra la red de rutas (una sola vez)
  const ajusteInicialHecho = useRef(false);
  useEffect(() => {
    if (ajusteInicialHecho.current || latitudInicio !== undefined || !rutas.length) return;
    ajusteInicialHecho.current = true;
    const todas = rutas.flatMap(r => r.coordenadas);
    if (todas.length) map.fitBounds(new LatLngBounds(todas.map(c => [c.latitud, c.longitud])), { padding: [40, 40] });
  }, [rutas, latitudInicio, map]);

  // 3. Al pulsar "Iniciar ruta" se muestra tu ubicación junto con la ruta elegida (una vez por ruta)
  const idRutaActiva = rutaActiva?.id;
  useEffect(() => {
    if (!rutaActiva?.coordenadas.length) return;
    const puntos: [number, number][] = rutaActiva.coordenadas.map(c => [c.latitud, c.longitud]);
    if (latitudInicio !== undefined && longitudInicio !== undefined) puntos.push([latitudInicio, longitudInicio]);
    map.fitBounds(new LatLngBounds(puntos), { padding: [70, 70] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRutaActiva, map]);

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
}

export function MapaCiclista({ rutas, rutaSeleccionada, marcadores, puntoInicio, puntoDestino, alClicMapa, modoClic, seguridadPlanificada, rutaActiva = null, seguirUsuario = false }: PropiedadesMapaCiclista) {
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

      <ActualizadorMapa rutas={rutas} inicio={puntoInicio} rutaActiva={rutaActiva} seguirUsuario={seguirUsuario} />
      <BotonMiUbicacion inicio={puntoInicio} />
      <ManejadorClics modo={modoClic} alClicMapa={alClicMapa} />

      {/* ── Rutas ─────────────────────────────────────────── */}
      {rutas.map(ruta => {
        const estaActivo = rutaSeleccionada?.id === ruta.id;
        return (
          <Polyline
            key={ruta.id}
            positions={ruta.coordenadas.map(c => [c.latitud, c.longitud])}
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
        const configuracion = mapaIconosMarcadores[m.tipo] ?? mapaIconosMarcadores.poi;
        return (
          <Marker key={m.id} position={[m.posicion.latitud, m.posicion.longitud]} icon={iconoCirculo(configuracion.fondo, configuracion.emoji)}>
            <Popup><strong>{m.titulo}</strong></Popup>
          </Marker>
        );
      })}

      {/* ── Marcador de inicio ───────────────────────────────────── */}
      {puntoInicio && (
        <Marker
          position={[puntoInicio.posicion.latitud, puntoInicio.posicion.longitud]}
          icon={iconoInicio()}
          zIndexOffset={1000}
        >
          <Popup>
            <strong>📍 Inicio</strong>
            {puntoInicio.direccion && <><br />{puntoInicio.direccion}</>}
          </Popup>
        </Marker>
      )}

      {/* ── Marcador de destino ─────────────────────────────────────── */}
      {puntoDestino && (
        <Marker
          position={[puntoDestino.posicion.latitud, puntoDestino.posicion.longitud]}
          icon={iconoDestino()}
          zIndexOffset={1000}
        >
          <Popup>
            <strong>🎯 Destino</strong>
            {puntoDestino.direccion && <><br />{puntoDestino.direccion}</>}
          </Popup>
        </Marker>
      )}

      {/* ── Línea de ruta (coloreada según el nivel de seguridad estimado) ── */}
      {puntoInicio && puntoDestino && seguridadPlanificada && (
        <Polyline
          positions={[
            [puntoInicio.posicion.latitud, puntoInicio.posicion.longitud],
            [puntoDestino.posicion.latitud, puntoDestino.posicion.longitud],
          ]}
          color={colorSeguridad(seguridadPlanificada.nivel)}
          weight={5}
          dashArray="10,8"
          opacity={0.9}
        >
          <Popup>
            <div style={{ fontFamily: 'var(--font-body)', minWidth: 200 }}>
              <strong>Ruta planificada · {etiquetaSeguridad(seguridadPlanificada.nivel)}</strong>
              <br />
              <span style={{ fontSize: 12, color: '#aaa' }}>{seguridadPlanificada.motivo}</span>
            </div>
          </Popup>
        </Polyline>
      )}
    </MapContainer>
  );
}