// Manejo central de solicitudes, respuestas y errores.
// El navegador solo habla con su mismo origen (Nginx en el contenedor, proxy de
// Vite en desarrollo) mediante rutas relativas; nunca llama directo a las API.
// Errores de ambas API: `{ "error": "mensaje" }`.

export const MENSAJE_GENERICO = 'No se pudo completar la operación. Inténtalo nuevamente.'

export class ApiError extends Error {
  // status 0 = sin respuesta (error de conexión).
  constructor(mensaje, status = 0) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
  }
}

function mensajeUtilizable(datos) {
  if (!datos || typeof datos.error !== 'string') return null
  const texto = datos.error.trim()
  return texto ? texto : null
}

export async function solicitar(ruta, { method = 'GET', body } = {}) {
  const opciones = { method, headers: { Accept: 'application/json' } }
  if (body !== undefined) {
    opciones.headers['Content-Type'] = 'application/json'
    opciones.body = JSON.stringify(body)
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
    throw new ApiError(mensajeUtilizable(datos) ?? MENSAJE_GENERICO, respuesta.status)
  }
  return datos
}

// Mensaje apto para el usuario a partir de cualquier error.
export function mensajeDeError(error) {
  return error instanceof ApiError ? error.message : MENSAJE_GENERICO
}
