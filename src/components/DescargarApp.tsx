import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Modal } from './Modal';
import { RUTA_APK_ANDROID, ENLACE_IOS } from '../configuracion';

// Botón "Descargar app": solo se muestra en la versión web, no dentro de la app instalada.
export function DescargarApp() {
  const [abierto, setAbierto] = useState(false);
  const [apkDisponible, setApkDisponible] = useState(false);

  // Comprueba que el APK exista (el servidor de desarrollo devuelve HTML si falta el archivo)
  useEffect(() => {
    if (!abierto) return;
    fetch(RUTA_APK_ANDROID, { method: 'HEAD' })
      .then(respuesta => {
        const tipo = respuesta.headers.get('content-type') ?? '';
        setApkDisponible(respuesta.ok && !tipo.includes('text/html'));
      })
      .catch(() => setApkDisponible(false));
  }, [abierto]);

  if (Capacitor.isNativePlatform()) return null;

  return (
    <>
      <button onClick={() => setAbierto(true)} style={estiloBotonHeader}>
        📲 Descargar app
      </button>

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="📲 Descargar la app"
        subtitulo="Instala Ciclo Rutas Seguras en tu celular"
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {apkDisponible ? (
            <a href={RUTA_APK_ANDROID} download="CicloRutas.apk" style={{ ...estiloOpcion, background: 'var(--green)', color: '#000' }}>
              🤖 Descargar para Android (.apk)
            </a>
          ) : (
            <div style={{ ...estiloOpcion, opacity: 0.6, cursor: 'default' }}>
              🤖 Android: instalador aún no publicado
            </div>
          )}

          {ENLACE_IOS ? (
            <a href={ENLACE_IOS} target="_blank" rel="noreferrer" style={{ ...estiloOpcion, background: 'var(--accent)', color: '#fff' }}>
               Obtener para iPhone (TestFlight / App Store)
            </a>
          ) : (
            <div style={{ ...estiloOpcion, cursor: 'default', textAlign: 'left', fontWeight: 400, fontSize: 13, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}> iPhone (versión de prueba)</strong>
              <br />1. Abre esta página en <strong>Safari</strong>.
              <br />2. Toca <strong>Compartir</strong> (cuadro con flecha ↑).
              <br />3. Elige <strong>“Añadir a pantalla de inicio”</strong>.
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>
          En Android, al abrir el archivo permite “instalar apps de orígenes desconocidos”.
        </p>
      </Modal>
    </>
  );
}

const estiloBotonHeader: React.CSSProperties = {
  background: 'var(--green)',
  color: '#000',
  border: 'none',
  borderRadius: 20,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

const estiloOpcion: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  padding: '14px 16px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  background: 'var(--bg3)',
  color: 'var(--text2)',
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
  cursor: 'pointer',
};
