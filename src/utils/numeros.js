// Lectura de números escritos por el usuario (notas, nota objetivo, peso).
// Solo valida la entrada del formulario; los cálculos los hace uni-notas-api.

const PATRON = /^\d+(?:[.,](\d+))?$/

// Devuelve { valor, error }. `valor` es Number o null (texto vacío y permitido).
export function leerDecimal(texto, { min, max, minExclusivo = false, opcional = false, mensajeRango }) {
  const limpio = String(texto ?? '').trim()
  if (limpio === '') {
    return opcional ? { valor: null, error: null } : { valor: null, error: mensajeRango }
  }
  const coincide = PATRON.exec(limpio)
  if (!coincide) return { valor: null, error: mensajeRango }

  const valor = Number(limpio.replace(',', '.'))
  const fueraDeRango = (minExclusivo ? valor <= min : valor < min) || valor > max
  if (fueraDeRango) return { valor: null, error: mensajeRango }

  const decimales = coincide[1] ? coincide[1].length : 0
  if (decimales > 2) return { valor: null, error: 'Admite como máximo 2 decimales.' }

  return { valor, error: null }
}

export const MENSAJES = {
  nombre: 'El nombre es obligatorio.',
  notaObjetivo: 'La nota objetivo debe ser un número entre 0 y 20.',
  nota: 'La nota debe ser un número entre 0 y 20, o quedar vacía si está pendiente.',
  peso: 'El peso debe ser un número mayor que 0 y menor o igual que 100.',
}

export const leerNotaObjetivo = (texto) =>
  leerDecimal(texto, { min: 0, max: 20, mensajeRango: MENSAJES.notaObjetivo })

export const leerNota = (texto) =>
  leerDecimal(texto, { min: 0, max: 20, opcional: true, mensajeRango: MENSAJES.nota })

export const leerPeso = (texto) =>
  leerDecimal(texto, { min: 0, max: 100, minExclusivo: true, mensajeRango: MENSAJES.peso })

// Número de la API → texto para un campo de formulario (null → '').
export const aTexto = (valor) => (valor === null || valor === undefined ? '' : String(valor))
