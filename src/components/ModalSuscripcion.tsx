import { useState } from 'react';
import { Modal } from './Modal';
import { TipoPlan, CuentaUsuario } from '../types';

interface PropiedadesModalSuscripcion {
  abierto: boolean;
  alCerrar: () => void;
  alSuscribirse: (plan: TipoPlan) => void;
  cuenta: CuentaUsuario;
}

const planes = [
  {
    id: 'mensual' as TipoPlan,
    nombre: 'Mensual',
    precio: '$10.000',
    periodo: '/mes',
    insignia: null,
    caracteristicas: [
      'Sin publicidad',
      'Todas las rutas',
      'Reportes ilimitados',
      'Historial de rutas',
      'Soporte estándar',
    ],
  },
  {
    id: 'anual' as TipoPlan,
    nombre: 'Anual',
    precio: '$100.000',
    periodo: '/año',
    insignia: 'MEJOR VALOR',
    caracteristicas: [
      'Sin publicidad',
      'Todas las rutas',
      'Reportes ilimitados',
      'Historial de rutas',
      'Soporte prioritario',
      'Licencia completa por 1 año',
      'Ahorras $20.000 al año',
    ],
  },
];

export function ModalSuscripcion({ abierto, alCerrar, alSuscribirse, cuenta }: PropiedadesModalSuscripcion) {
  const [planSeleccionado, setPlanSeleccionado] = useState<TipoPlan>('anual');

  const manejarSuscripcion = () => {
    alSuscribirse(planSeleccionado);
    alCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="⭐ Ciclo Rutas Pro"
      subtitulo="Elige el plan perfecto para ti"
      anchoMaximo={500}
    >
      {/* Información de prueba si aún está en periodo de prueba */}
      {cuenta.plan === 'prueba' && cuenta.diasPruebaRestantes > 0 && (
        <div style={{
          background: 'var(--amber-dim)',
          border: '1px solid rgba(255,177,66,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--amber)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          🕐 Te quedan <strong>{cuenta.diasPruebaRestantes} días</strong> de prueba gratuita — actualmente estás viendo publicidad
        </div>
      )}

      {/* Tarjetas de planes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {planes.map(plan => (
          <div
            key={plan.id}
            onClick={() => setPlanSeleccionado(plan.id)}
            style={{
              background: planSeleccionado === plan.id ? 'var(--green-dim)' : 'var(--bg3)',
              border: `2px solid ${planSeleccionado === plan.id ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '18px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            {plan.insignia && (
              <div style={{
                background: 'var(--green)',
                color: '#000',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-block',
                marginBottom: 6,
                letterSpacing: '0.05em',
              }}>
                {plan.insignia}
              </div>
            )}
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 800,
              marginBottom: 4,
            }}>
              {plan.nombre}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', margin: '8px 0' }}>
              {plan.precio}
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>{plan.periodo}</span>
            </div>
            <ul style={{ listStyle: 'none', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              {plan.caracteristicas.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Garantía */}
      <div style={{
        background: 'var(--green-dim)',
        border: '1px solid rgba(0,200,150,0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        fontSize: 12,
        color: 'var(--text2)',
        marginBottom: 18,
      }}>
        ✅ <strong style={{ color: 'var(--text)' }}>15 días de prueba gratuita</strong> · Sin cobros durante la prueba · Cancela cuando quieras · Sin compromisos
      </div>

      <button onClick={manejarSuscripcion} style={{
        width: '100%',
        background: 'var(--green)',
        color: '#000',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: '15px 0',
        fontSize: 15,
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.2px',
        transition: 'all 0.15s',
      }}>
        Iniciar suscripción Pro 🚀
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        Al suscribirte se te asignará un usuario Pro sin publicidad
      </p>
    </Modal>
  );
}
