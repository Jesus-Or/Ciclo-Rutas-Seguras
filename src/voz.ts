// ── Voz del asistente de ruta (usa la síntesis de voz del dispositivo) ──────────
// No necesita internet ni claves. En el celular usa la voz en español instalada en el teléfono.

const CLAVE = 'ciclorutas_voz_activa';

export function vozDisponible(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function leerVozActiva(): boolean {
  try { return localStorage.getItem(CLAVE) !== '0'; } catch { return true; }
}

let activa = leerVozActiva();

export function establecerVozActiva(valor: boolean) {
  activa = valor;
  try { localStorage.setItem(CLAVE, valor ? '1' : '0'); } catch { /* sin almacenamiento */ }
  if (!valor && vozDisponible()) window.speechSynthesis.cancel();
}

// Elige la mejor voz en español disponible (Colombia > México > España > cualquiera en español)
function elegirVoz(): SpeechSynthesisVoice | null {
  const voces = window.speechSynthesis.getVoices();
  for (const prefijo of ['es-CO', 'es-MX', 'es-US', 'es-419', 'es-ES', 'es']) {
    const voz = voces.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(prefijo.toLowerCase()));
    if (voz) return voz;
  }
  return null;
}

// urgente = corta lo que se esté diciendo y habla de inmediato (giros, desvíos, llegada)
export function hablar(texto: string, urgente = false) {
  if (!activa || !vozDisponible() || !texto.trim()) return;
  try {
    const sintetizador = window.speechSynthesis;
    if (urgente) sintetizador.cancel();
    const frase = new SpeechSynthesisUtterance(texto);
    frase.lang = 'es-CO';
    frase.rate = 1;
    frase.pitch = 1;
    const voz = elegirVoz();
    if (voz) frase.voice = voz;
    sintetizador.speak(frase);
  } catch { /* la voz es opcional: si falla, la app sigue funcionando */ }
}

// Se llama desde un clic del usuario: algunos navegadores solo dejan hablar después de una interacción
export function desbloquearVoz() {
  if (!vozDisponible()) return;
  try {
    const silencio = new SpeechSynthesisUtterance(' ');
    silencio.volume = 0;
    window.speechSynthesis.speak(silencio);
  } catch { /* nada */ }
}

export function detenerVoz() {
  if (vozDisponible()) { try { window.speechSynthesis.cancel(); } catch { /* nada */ } }
}

// "1 hora, 5 minutos y 20 segundos"
export function duracionHablada(segundos: number): string {
  const total = Math.max(1, Math.round(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const partes: string[] = [];
  if (h) partes.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
  if (m) partes.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  if (s && !h) partes.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`);
  if (partes.length === 0) return '1 segundo';
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

export function distanciaHablada(metros: number): string {
  if (metros >= 950) {
    const km = Math.round(metros / 100) / 10;
    return `${String(km).replace('.', ',')} kilómetros`;
  }
  const redondeado = Math.max(10, Math.round(metros / 10) * 10);
  return `${redondeado} metros`;
}
