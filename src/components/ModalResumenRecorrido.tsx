import React from 'react';
import { Modal } from './Modal';
import type { Recorrido } from '../recorrido';
import { formatearCronometro } from '../utils';

interface Propiedades {
  recorrido: Recorrido | null;
  titulo?: string;
  alCerrar: () => void;
  alVerEnMapa: (r: Recorrido) => void;
}

export function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{etiqueta}</div>
    </div>
  );
}

export function ModalResumenRecorrido({ recorrido, titulo = '🧭 Resumen de tu recorrido', alCerrar, alVerEnMapa }: Propiedades) {
  if (!recorrido) return null;
  const fecha = new Date(recorrido.inicio).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Modal abierto={true} alCerrar={alCerrar} titulo={titulo} subtitulo={recorrido.rutaNombre ? `${recorrido.rutaNombre} · ${fecha}` : fecha}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <Dato valor={`${recorrido.distanciaKm.toFixed(2).replace('.', ',')} km`} etiqueta="Distancia recorrida" />
        <Dato valor={formatearCronometro(recorrido.segundos)} etiqueta="Tiempo" />
        <Dato valor={`${recorrido.velocidadMediaKmh.toFixed(1).replace('.', ',')} km/h`} etiqueta="Velocidad media" />
        <Dato valor={`${recorrido.velocidadMaxKmh.toFixed(1).replace('.', ',')} km/h`} etiqueta="Velocidad máxima" />
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px' }}>
        Guardado en tu historial (pestaña Estadísticas). La línea azul del mapa es lo que recorriste.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { alVerEnMapa(recorrido); alCerrar(); }} style={primario}>🗺️ Ver en el mapa</button>
        <button onClick={alCerrar} style={fantasma}>Cerrar</button>
      </div>
    </Modal>
  );
}

const primario: React.CSSProperties = {
  flex: 1, background: 'var(--green)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)',
  padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
};
const fantasma: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', color: 'var(--text2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '12px 18px', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)',
};
