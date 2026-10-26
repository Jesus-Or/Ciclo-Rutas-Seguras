import React, { useState } from 'react';
import { RutaCiclista } from '../types';
import { Modal, SeccionModal, SelectorEtiquetas } from './Modal';
import { CalificacionEstrellas } from './CalificacionEstrellas';
import { IMPRESIONES_RUTA } from '../utils';

interface PropiedadesModalFinalizarRuta {
  ruta: RutaCiclista | null;
  abierto: boolean;
  tiempoReal: string;
  alCerrar: () => void;
  alEnviar: (calificacion: number, impresiones: string[], comentario: string) => void;
}

export function ModalFinalizarRuta({ ruta, abierto, tiempoReal, alCerrar, alEnviar }: PropiedadesModalFinalizarRuta) {
  const [calificacion, setCalificacion]           = useState(0);
  const [impresiones, setImpresiones] = useState<string[]>([]);
  const [comentario, setComentario]         = useState('');
  const [error, setError]             = useState('');

  const reiniciar = () => {
    setCalificacion(0);
    setImpresiones([]);
    setComentario('');
    setError('');
  };

  const manejarCierre = () => { reiniciar(); alCerrar(); };

  const manejarEnvio = () => {
    if (!calificacion) { setError('Selecciona al menos una estrella para continuar.'); return; }
    alEnviar(calificacion, impresiones, comentario);
    reiniciar();
  };

  const alternarImpresion = (v: string) =>
    setImpresiones(anterior => anterior.includes(v) ? anterior.filter(x => x !== v) : [...anterior, v]);

  if (!ruta) return null;

  return (
    <Modal
      abierto={abierto}
      alCerrar={manejarCierre}
      titulo="🏁 ¡Ruta completada!"
      subtitulo={`${ruta.nombre} · ⏱️ Tu tiempo: ${tiempoReal}`}
    >
      <SeccionModal etiqueta="Calificación general (1–5 estrellas)">
        <CalificacionEstrellas valor={calificacion} alCambiar={v => { setCalificacion(v); setError(''); }} />
        {error && (
          <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</p>
        )}
      </SeccionModal>

      <SeccionModal etiqueta="¿Cómo te pareció la ruta?">
        <SelectorEtiquetas
          opciones={IMPRESIONES_RUTA}
          seleccionados={impresiones}
          alAlternar={alternarImpresion}
        />
      </SeccionModal>

      <SeccionModal etiqueta="Comentario adicional (opcional)">
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="¿Algo que quieras compartir con otros ciclistas?"
          rows={3}
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            resize: 'none',
            outline: 'none',
          }}
        />
      </SeccionModal>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={manejarEnvio} style={botonPrimario}>
          ✅ Enviar reseña
        </button>
        <button onClick={manejarCierre} style={botonFantasma}>
          Ahora no
        </button>
      </div>
    </Modal>
  );
}

const botonPrimario: React.CSSProperties = {
  flex: 1,
  background: 'var(--green)',
  color: '#000',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: '12px 0',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'all 0.15s',
};

const botonFantasma: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  color: 'var(--text2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 18px',
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};
