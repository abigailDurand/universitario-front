// fetch simulado para pruebas: una lista de manejadores por método y ruta.
// Solo se usa en test/; la aplicación nunca incluye datos simulados.
import { vi } from 'vitest'

export function respuestaJson(datos, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const respuesta204 = () => new Response(null, { status: 204 })

// rutas: { 'GET /api/notas/cursos': (llamada) => Response | Promise<Response>, ... }
// Cada llamada queda registrada en `llamadas` con { method, url, body }.
export function simularFetch(rutas) {
  const llamadas = []
  const fn = vi.fn(async (url, opciones = {}) => {
    const method = opciones.method ?? 'GET'
    const body = opciones.body === undefined ? undefined : JSON.parse(opciones.body)
    const llamada = { method, url, body }
    llamadas.push(llamada)
    const manejador = rutas[`${method} ${url}`]
    if (!manejador) throw new Error(`Ruta no simulada: ${method} ${url}`)
    return manejador(llamada)
  })
  vi.stubGlobal('fetch', fn)
  return { fn, llamadas }
}
