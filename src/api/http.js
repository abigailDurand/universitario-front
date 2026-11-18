// Manejo central de solicitudes, respuestas, errores y del token.
// El navegador solo habla con su mismo origen (Nginx en el contenedor, proxy de
// Vite en desarrollo) mediante rutas relativas; nunca llama directo a las API.
// Errores de las API: `{ "error": "mensaje" }`.
// Autenticación (notas-service/AUTH.md): `Authorization: Bearer <token>` en cada
// solicitud autenticada; un 401 o una sesión vencida cierran la sesión.
import { borrarSesion, leerSesion, sesionVencida } from './sesion.js'

export const MENSAJE_GENERICO = 'No se pudo completar la operación. Inténtalo nuevamente.'
export const MENSAJE_SESION_VENCIDA = 'La sesión venció. Inicia sesión de nuevo.'

export class ApiError extends Error {
  // status 0 = sin respuesta (error de conexión).
  constructor(mensaje, status = 0) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
  }
}

// La app registra aquí qué hacer cuando la sesión deja de ser válida.
let alCerrarSesion = null
export function registrarCierreDeSesion(fn) {
  alCerrarSesion = fn
  return () => {
    if (alCerrarSesion === fn) alCerrarSesion = null
  }
}

function sesionInvalida(mensaje) {
  borrarSesion()
  alCerrarSesion?.(mensaje)
  return new ApiError(mensaje, 401)
}

function mensajeUtilizable(datos) {
  if (!datos || typeof datos.error !== 'string') return null
  const texto = datos.error.trim()
  return texto ? texto : null
}

// autenticada: false solo para registro y login (públicos).
export async function solicitar(ruta, { method = 'GET', body, autenticada = true } = {}) {
  const opciones = { method, headers: { Accept: 'application/json' } }
  if (body !== undefined) {
    opciones.headers['Content-Type'] = 'application/json'
    opciones.body = JSON.stringify(body)
  }

  if (autenticada) {
    const sesion = leerSesion()
    if (sesion && sesionVencida(sesion)) throw sesionInvalida(MENSAJE_SESION_VENCIDA)
    if (sesion) opciones.headers.Authorization = `Bearer ${sesion.token}`
  }

  let respuesta
  try {
    respuesta = await fetch(ruta, opciones)
  } catch {
    throw new ApiError(MENSAJE_GENERICO, 0)
  }

  // 204 No Content: no se interpreta JSON.
  if (respuesta.status === 204) return null

  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    const mensaje = mensajeUtilizable(datos) ?? MENSAJE_GENERICO
    if (respuesta.status === 401 && autenticada) throw sesionInvalida(mensaje)
    throw new ApiError(mensaje, respuesta.status)
  }
  return datos
}

// Mensaje apto para el usuario a partir de cualquier error.
export function mensajeDeError(error) {
  return error instanceof ApiError ? error.message : MENSAJE_GENERICO
}
