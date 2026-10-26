import React, { useState } from 'react';
import { ReporteIncidente, TipoIncidente } from '../types';
import { Modal, SeccionModal, SelectorEtiquetas } from './Modal';
import { TIPOS_INCIDENTE } from '../utils';

interface PropiedadesModalReporte {
  abierto: boolean;
  alCerrar: () => void;
  alEnviar: (reporte: Omit<ReporteIncidente, 'id' | 'creadoEn'>) => void;
  idRuta?: string;
}

export function ModalReporte({ abierto, alCerrar, alEnviar, idRuta }: PropiedadesModalReporte) {
  const [seleccionados, setSeleccionados]     = useState<string[]>([]);
  const [ubicacion, setUbicacion]     = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError]           = useState('');

  const reiniciar = () => {
    setSeleccionados([]);
    setUbicacion('');
    setDescripcion('');
    setError('');
  };

  const manejarCierre = () => { reiniciar(); alCerrar(); };

  const manejarEnvio = () => {
    if (!seleccionados.length) { setError('Selecciona al menos un tipo de incidente.'); return; }
    alEnviar({
      idRuta,
      tipo: seleccionados[0] as TipoIncidente,
      ubicacion,
      descripcion,
    });
    reiniciar();
  };

  const alternarTipo = (v: string) => {
    setError('');
    setSeleccionados(anterior => anterior.includes(v) ? anterior.filter(x => x !== v) : [...anterior, v]);
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={manejarCierre}
      titulo="⚠️ Reportar Incidente"
      subtitulo="Ayuda a la comunidad informando sobre riesgos en la vía"
    >
      <SeccionModal etiqueta="Tipo de incidente">
        <SelectorEtiquetas
          opciones={TIPOS_INCIDENTE}
          seleccionados={seleccionados}
          alAlternar={alternarTipo}
          peligro
        />
        {error && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</p>}
      </SeccionModal>

      <SeccionModal etiqueta="Ubicación del incidente">
        <input
          value={ubicacion}
          onChange={e => setUbicacion(e.target.value)}
          placeholder="Ej: Av. Séptima con calle 80"
          style={estiloInput}
        />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
          💡 También puedes hacer clic en el mapa para marcar la ubicación exacta
        </p>
      </SeccionModal>

      <SeccionModal etiqueta="Descripción (opcional)">
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Describe el incidente para ayudar a otros ciclistas..."
          rows={3}
          style={{ ...estiloInput, resize: 'none' }}
        />
      </SeccionModal>

      <button onClick={manejarEnvio} style={{
        width: '100%',
        background: 'var(--red)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        padding: '13px 0',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}>
        Enviar Reporte
      </button>
    </Modal>
  );
}

const estiloInput: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  fontSize: 13,
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
};
