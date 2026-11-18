// La interfaz trabaja explícitamente en hora de Perú (UTC−05:00, sin horario de
// verano), sin depender de la zona horaria del navegador.

const DESFASE_MS = 5 * 60 * 60 * 1000

const FORMATO = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// ISO de la API → texto legible en hora de Perú, p. ej. "05/12/2026, 08:00".
export function formatearFechaPeru(iso) {
  const instante = Date.parse(iso)
  return Number.isNaN(instante) ? iso : FORMATO.format(instante)
}

// ISO de la API → valor de <input type="datetime-local"> en hora de Perú ("YYYY-MM-DDTHH:MM").
export function isoAEntradaPeru(iso) {
  const instante = Date.parse(iso)
  if (Number.isNaN(instante)) return ''
  return new Date(instante - DESFASE_MS).toISOString().slice(0, 16)
}

// Valor de datetime-local (hora de Perú) → ISO con zona, sin fracciones de segundo.
// "2026-12-05T08:00" → "2026-12-05T08:00:00-05:00"
export function entradaPeruAIso(valor) {
  const base = String(valor ?? '').slice(0, 16)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(base)) return null
  return `${base}:00-05:00`
}
