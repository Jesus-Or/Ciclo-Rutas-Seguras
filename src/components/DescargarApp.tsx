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
          🌐 Continuar con Chrome / Instalar App
        </button>
      ) : (
        <div style={{ ...estiloOpcion, cursor: 'default', textAlign: 'left', fontWeight: 400, fontSize: 13, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>🌐 Continuar con Chrome</strong>
          <br />Abre el menú <strong>⋮</strong> de Chrome y elige <strong>“Instalar app”</strong> o <strong>“Añadir a pantalla de inicio”</strong>.
        </div>
      )}
      
      <a href={URL_APK_ANDROID} style={{ ...estiloOpcion, background: 'var(--bg3)', color: 'var(--text)' }}>
        📦 Descargar el instalador (.apk)
      </a>

      {/* Botón para Iniciar sesión con Google integrado en las opciones de Android */}
      <button 
        onClick={() => {
          setAbierto(false);
          const botonLogin = document.querySelector('[data-action="login"]') as HTMLButtonElement;
          if (botonLogin) {
            botonLogin.click();
          } else {
            window.location.hash = '#login'; 
          }
        }} 
        style={{ ...estiloOpcion, background: '#fff', color: '#757575', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: 'block' }}>
          <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.71H.92v2.32C2.4 15.86 5.43 18 9 18z" fill="#34A853"/>
          <path d="M3.95 10.69c-.18-.54-.28-1.12-.28-1.69s.1-1.15.28-1.69V5.01H.92A8.99 8.99 0 0 0 0 9c0 1.46.35 2.85.92 4.09l3.03-2.4z" fill="#FBBC05"/>
          <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A8.99 8.99 0 0 0 9 0C5.43 0 2.4 2.14.92 5.01l3.03 2.32C4.66 5.16 6.65 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Iniciar sesión con Google
      </button>
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
        subtitulo="Instala Ciclo Rutas Seguras en tu celular o continúa con tu cuenta"
      >
        <div style={{ display: 'grid', gap: 12 }}>{bloques}</div>

        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>
          Con el .apk, Android pedirá permitir “instalar apps de orígenes desconocidos”. Si experimentas errores de inicio de sesión dentro del APK, utiliza la opción recomendada de <strong>Chrome</strong>.
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
