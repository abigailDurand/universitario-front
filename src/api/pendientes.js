// uni-pendientes-api. Contrato: pendientes-service/SPEC.md §2.
// Pendiente: { id, titulo, descripcion, curso_nombre, tipo, fecha_limite, estado, vencido }
import { solicitar } from './http.js'

const BASE = '/api/pendientes'

// filtros: { estado?: 'pendiente' | 'completado', tipo?: 'tarea' | 'examen' }
// "Todos" = omitir el parámetro: nunca se envían valores vacíos ni "todos".
export function rutaListado(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.estado === 'pendiente' || filtros.estado === 'completado') {
    params.set('estado', filtros.estado)
  }
  if (filtros.tipo === 'tarea' || filtros.tipo === 'examen') {
    params.set('tipo', filtros.tipo)
  }
  const consulta = params.toString()
  return consulta ? `${BASE}?${consulta}` : BASE
}

export const listarPendientes = (filtros) => solicitar(rutaListado(filtros))

// datos: { titulo, curso_nombre, tipo, fecha_limite, descripcion } (sin estado: usa "pendiente")
export const crearPendiente = (datos) =>
  solicitar(BASE, { method: 'POST', body: datos })

// cambios: solo los campos modificados (al menos uno)
export const editarPendiente = (id, cambios) =>
  solicitar(`${BASE}/${id}`, { method: 'PATCH', body: cambios })

export const cambiarEstado = (id, estado) => editarPendiente(id, { estado })

export const eliminarPendiente = (id) =>
  solicitar(`${BASE}/${id}`, { method: 'DELETE' })
