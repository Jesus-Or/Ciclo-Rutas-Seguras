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

const DEGRADADO = 'linear-gradient(135deg, #00e0a8 0%, #00c896 45%, #00a37c 100%)';

// Animaciones y efectos al pasar el mouse (solo para este componente)
const ESTILOS = `
@keyframes descargaBrillo { 0% { transform: translateX(-120%) skewX(-20deg); } 60%,100% { transform: translateX(260%) skewX(-20deg); } }
@keyframes descargaLatido { 0%,100% { box-shadow: 0 0 0 0 rgba(0,200,150,0.55), 0 4px 14px rgba(0,200,150,0.35); } 50% { box-shadow: 0 0 0 8px rgba(0,200,150,0), 0 4px 14px rgba(0,200,150,0.35); } }
@keyframes descargaFlota { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.descarga-boton-header { position: relative; overflow: hidden; animation: descargaLatido 2.6s ease-in-out infinite; transition: transform .15s ease; }
.descarga-boton-header:hover { transform: translateY(-1px) scale(1.03); }
.descarga-boton-header::after { content: ''; position: absolute; top: 0; bottom: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); animation: descargaBrillo 3.4s ease-in-out infinite; }
.descarga-cta { position: relative; overflow: hidden; transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
.descarga-cta:hover { transform: translateY(-2px); filter: brightness(1.06); box-shadow: 0 10px 26px rgba(0,200,150,0.35); }
.descarga-cta:active { transform: translateY(0); }
.descarga-secundario:hover { border-color: rgba(0,200,150,0.55) !important; background: rgba(0,200,150,0.08) !important; }
.descarga-icono { animation: descargaFlota 3.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .descarga-boton-header, .descarga-icono, .descarga-boton-header::after { animation: none !important; } }
`;

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

  // ── Tarjeta de Android ──────────────────────────────────────────────
  const tarjetaAndroid = (
    <TarjetaPlataforma key="android" icono="🤖" nombre="Android" detalle="Instalación directa" recomendada={ESTA_EN_ANDROID}>
      {eventoInstalacion ? (
        <button className="descarga-cta" onClick={instalarWeb} style={estiloBotonPrincipal}>
          <span style={{ fontSize: 18 }}>⚡</span> Instalar ahora
        </button>
      ) : (
        <Pasos pasos={[
          <>Abre el menú <strong>⋮</strong> de Chrome</>,
          <>Elige <strong>“Instalar app”</strong> o <strong>“Añadir a pantalla de inicio”</strong></>,
        ]} />
      )}
      <a className={eventoInstalacion ? 'descarga-secundario' : 'descarga-cta'} href={URL_APK_ANDROID}
        style={eventoInstalacion ? estiloBotonSecundario : estiloBotonPrincipal}>
        <span style={{ fontSize: 17 }}>📦</span> Descargar instalador (.apk)
      </a>
    </TarjetaPlataforma>
  );

  // ── Tarjeta de iPhone ───────────────────────────────────────────────
  const tarjetaIos = (
    <TarjetaPlataforma key="ios" icono="🍎" nombre="iPhone" detalle={ENLACE_IOS ? 'TestFlight / App Store' : 'Desde Safari'} recomendada={ESTA_EN_IOS}>
      {ENLACE_IOS ? (
        <a className="descarga-cta" href={ENLACE_IOS} target="_blank" rel="noreferrer" style={estiloBotonPrincipal}>
          <span style={{ fontSize: 17 }}>🍎</span> Obtener para iPhone
        </a>
      ) : (
        <Pasos pasos={[
          <>Abre esta página en <strong>Safari</strong></>,
          <>Toca <strong>Compartir</strong> (el cuadro con flecha ↑)</>,
          <>Elige <strong>“Añadir a pantalla de inicio”</strong></>,
        ]} />
      )}
    </TarjetaPlataforma>
  );

  // Primero lo que corresponde al celular del usuario
  const tarjetas = ESTA_EN_IOS ? [tarjetaIos, tarjetaAndroid] : [tarjetaAndroid, tarjetaIos];

  return (
    <>
      <style>{ESTILOS}</style>

      <button className="descarga-boton-header" onClick={() => setAbierto(true)} style={estiloBotonHeader}>
        📲 Descargar app
      </button>

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="Descarga la app"
        subtitulo="Llévala en tu bolsillo, lista para rodar"
        anchoMaximo={480}
      >
        {/* Presentación de la app */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: 16, marginBottom: 14,
          borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0,200,150,0.25)',
          background: 'radial-gradient(120% 140% at 0% 0%, rgba(0,200,150,0.18) 0%, rgba(95,127,255,0.08) 55%, transparent 100%)',
        }}>
          <div className="descarga-icono" style={{
            width: 60, height: 60, borderRadius: 16, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: DEGRADADO, fontSize: 32, boxShadow: '0 8px 22px rgba(0,200,150,0.4)',
          }}>🚴</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>Ciclo Rutas Seguras</div>
            <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 2 }}>Rutas más seguras para pedalear en Bogotá</div>
          </div>
        </div>

        {/* Ventajas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {['⚡ Acceso directo', '🖥️ Pantalla completa', '📍 GPS en tu recorrido'].map(t => (
            <span key={t} style={{
              fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', padding: '5px 10px', borderRadius: 20,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            }}>{t}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>{tarjetas}</div>

        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '16px 2px 0', lineHeight: 1.55, display: 'flex', gap: 8 }}>
          <span aria-hidden>🔒</span>
          <span>
            Con el .apk, Android pedirá permitir “instalar apps de orígenes desconocidos”. Apple no permite
            instaladores fuera de la App Store, por eso en iPhone se instala desde Safari.
          </span>
        </p>
      </Modal>
    </>
  );
}

// ── Piezas del diseño ─────────────────────────────────────────────────
function TarjetaPlataforma({ icono, nombre, detalle, recomendada, children }: {
  icono: string; nombre: string; detalle: string; recomendada: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      position: 'relative', padding: 16, borderRadius: 'var(--radius-lg)',
      background: 'var(--bg3)', display: 'grid', gap: 12,
      border: `1px solid ${recomendada ? 'rgba(0,200,150,0.55)' : 'var(--border)'}`,
      boxShadow: recomendada ? '0 0 0 3px rgba(0,200,150,0.08)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 20,
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
        }}>{icono}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800 }}>{nombre}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{detalle}</div>
        </div>
        {recomendada && (
          <span style={{
            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#00160f',
            background: DEGRADADO, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap',
          }}>Para tu celular</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Pasos({ pasos }: { pasos: React.ReactNode[] }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
      {pasos.map((p, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.45 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
            fontSize: 11.5, fontWeight: 800, color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(0,200,150,0.35)',
          }}>{i + 1}</span>
          <span style={{ paddingTop: 2 }}>{p}</span>
        </li>
      ))}
    </ol>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────
const estiloBotonHeader: React.CSSProperties = {
  background: DEGRADADO,
  color: '#00160f',
  border: 'none',
  borderRadius: 20,
  padding: '8px 16px',
  fontSize: 12.5,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  whiteSpace: 'nowrap',
};

const estiloBotonPrincipal: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 'var(--radius-md)',
  border: 'none', background: DEGRADADO, color: '#00160f', fontSize: 14.5, fontWeight: 800,
  textDecoration: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
  boxShadow: '0 6px 18px rgba(0,200,150,0.28)',
};

const estiloBotonSecundario: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hover)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)',
  fontSize: 13.5, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
  transition: 'all .15s ease',
};
