import { useEffect } from 'react';
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
function ActualizadorMapa({ rutaSeleccionada, rutas, inicio, fin }: {
  rutaSeleccionada: RutaCiclista | null;
  rutas: RutaCiclista[];
  inicio: PuntoRuta | null;
  fin: PuntoRuta | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (rutaSeleccionada?.coordenadas.length) {
      map.fitBounds(
        new LatLngBounds(rutaSeleccionada.coordenadas.map(c => [c.latitud, c.longitud])),
        { padding: [60, 60] }
      );
    } else if (inicio && fin) {
      map.fitBounds(new LatLngBounds([
        [inicio.posicion.latitud, inicio.posicion.longitud],
        [fin.posicion.latitud, fin.posicion.longitud],
      ]), { padding: [80, 80] });
    } else if (inicio) {
      // Solo hay punto de partida (p. ej. la ubicación del usuario): centrar ahí
      map.setView([inicio.posicion.latitud, inicio.posicion.longitud], 15);
    } else if (rutas.length) {
      const todas = rutas.flatMap(r => r.coordenadas);
      if (todas.length) map.fitBounds(new LatLngBounds(todas.map(c => [c.latitud, c.longitud])), { padding: [40, 40] });
    }
  }, [rutaSeleccionada, rutas, inicio, fin, map]);
  return null;
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
}

export function MapaCiclista({ rutas, rutaSeleccionada, marcadores, puntoInicio, puntoDestino, alClicMapa, modoClic, seguridadPlanificada }: PropiedadesMapaCiclista) {
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

      <ActualizadorMapa rutaSeleccionada={rutaSeleccionada} rutas={rutas} inicio={puntoInicio} fin={puntoDestino} />
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
          color={colorSeguridad(seguridadPlanificada.level)}
          weight={5}
          dashArray="10,8"
          opacity={0.9}
        >
          <Popup>
            <div style={{ fontFamily: 'var(--font-body)', minWidth: 200 }}>
              <strong>Ruta planificada · {etiquetaSeguridad(seguridadPlanificada.level)}</strong>
              <br />
              <span style={{ fontSize: 12, color: '#aaa' }}>{seguridadPlanificada.reason}</span>
            </div>
          </Popup>
        </Polyline>
      )}
    </MapContainer>
  );
}
