import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Modal } from './Modal';
import { URL_APK_ANDROID, ENLACE_IOS } from '../configuracion';

// Evento de Chrome que permite instalar la web como app con un solo botón
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const agente = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const ESTA_EN_IOS = /iphone|ipad|ipod/i.test(agente);
const ESTA_EN_ANDROID = /android/i.test(agente);

// Botón "Descargar app": solo se muestra en la versión web, no dentro de la app instalada.
export function DescargarApp() {
  const [abierto, setAbierto] = useState(false);
  const [eventoInstalacion, setEventoInstalacion] = useState<EventoInstalacion | null>(null);
  const [yaInstalada, setYaInstalada] = useState(false);

  useEffect(() => {
    // La web ya está instalada y abierta como app
    setYaInstalada(window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);

    const guardarEvento = (e: Event) => { e.preventDefault(); setEventoInstalacion(e as EventoInstalacion); };
    const alInstalar = () => { setEventoInstalacion(null); setAbierto(false); };
    window.addEventListener('beforeinstallprompt', guardarEvento);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', guardarEvento);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  if (Capacitor.isNativePlatform() || yaInstalada) return null;

  const instalarWeb = async () => {
    if (!eventoInstalacion) return;
    await eventoInstalacion.prompt();
    await eventoInstalacion.userChoice;
    setEventoInstalacion(null);
  };

  const bloqueAndroid = (
    <div key="android" style={{ display: 'grid', gap: 10 }}>
      {eventoInstalacion ? (
        <button onClick={instalarWeb} style={{ ...estiloOpcion, background: 'var(--green)', color: '#000', border: 'none' }}>
          🤖 Instalar en Android (recomendado)
        </button>
      ) : (
        <div style={{ ...estiloOpcion, cursor: 'default', textAlign: 'left', fontWeight: 400, fontSize: 13, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>🤖 Android (instalar desde Chrome)</strong>
          <br />Abre el menú <strong>⋮</strong> de Chrome y elige <strong>“Instalar app”</strong> o <strong>“Añadir a pantalla de inicio”</strong>.
        </div>
      )}
      <a href={URL_APK_ANDROID} style={{ ...estiloOpcion, background: eventoInstalacion ? 'var(--bg3)' : 'var(--green)', color: eventoInstalacion ? 'var(--text2)' : '#000' }}>
        📦 Descargar el instalador (.apk)
      </a>
    </div>
  );

  const bloqueIos = ENLACE_IOS ? (
    <a key="ios" href={ENLACE_IOS} target="_blank" rel="noreferrer" style={{ ...estiloOpcion, background: 'var(--accent)', color: '#fff' }}>
      🍎 Obtener para iPhone (TestFlight / App Store)
    </a>
  ) : (
    <div key="ios" style={{ ...estiloOpcion, cursor: 'default', textAlign: 'left', fontWeight: 400, fontSize: 13, lineHeight: 1.6 }}>
      <strong style={{ color: 'var(--text)' }}>🍎 iPhone (versión de prueba)</strong>
      <br />1. Abre esta página en <strong>Safari</strong>.
      <br />2. Toca <strong>Compartir</strong> (cuadro con flecha ↑).
      <br />3. Elige <strong>“Añadir a pantalla de inicio”</strong>.
    </div>
  );

  // Se muestra primero lo que corresponde al celular del usuario
  const bloques = ESTA_EN_IOS ? [bloqueIos, bloqueAndroid] : ESTA_EN_ANDROID ? [bloqueAndroid, bloqueIos] : [bloqueAndroid, bloqueIos];

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
        <div style={{ display: 'grid', gap: 12 }}>{bloques}</div>

        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>
          Con el .apk, Android pedirá permitir “instalar apps de orígenes desconocidos”. iPhone no permite instaladores
          fuera de la App Store; por eso se instala desde Safari.
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
  width: '100%',
  boxSizing: 'border-box',
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
  fontFamily: 'var(--font-body)',
};