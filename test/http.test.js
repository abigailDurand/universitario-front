import { describe, expect, it, vi } from 'vitest'
import { ApiError, MENSAJE_GENERICO, mensajeDeError, solicitar } from '../src/api/http.js'
import { rutaListado } from '../src/api/pendientes.js'
import { respuesta204, respuestaJson } from './fetch-simulado.js'

describe('http.solicitar', () => {
  it('devuelve el JSON de una respuesta correcta y envía el cuerpo como JSON', async () => {
    const fetch = vi.fn(async () => respuestaJson({ id: 1 }, 201))
    vi.stubGlobal('fetch', fetch)
    await expect(solicitar('/api/notas/cursos', { method: 'POST', body: { nombre: 'A' } })).resolves.toEqual({ id: 1 })
    const [ruta, opciones] = fetch.mock.calls[0]
    expect(ruta).toBe('/api/notas/cursos')
    expect(opciones.method).toBe('POST')
    expect(opciones.headers['Content-Type']).toBe('application/json')
    expect(opciones.body).toBe('{"nombre":"A"}')
  })

  it('204 devuelve null sin interpretar JSON', async () => {
    const r = respuesta204()
    const json = vi.spyOn(r, 'json')
    vi.stubGlobal('fetch', vi.fn(async () => r))
    await expect(solicitar('/api/pendientes/1', { method: 'DELETE' })).resolves.toBeNull()
    expect(json).not.toHaveBeenCalled()
  })

  it('usa el mensaje `error` del backend', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaJson({ error: 'No se encontró el curso.' }, 404)))
    const error = await solicitar('/api/notas/cursos/9').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
    expect(error.message).toBe('No se encontró el curso.')
  })

  it('sin mensaje utilizable usa el texto genérico', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>404</html>', { status: 404 })))
    await expect(solicitar('/x')).rejects.toThrow(MENSAJE_GENERICO)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })))
    await expect(solicitar('/x')).rejects.toThrow(MENSAJE_GENERICO)
    vi.stubGlobal('fetch', vi.fn(async () => respuestaJson({ error: '  ' }, 400)))
    await expect(solicitar('/x')).rejects.toThrow(MENSAJE_GENERICO)
  })

  it('un fallo de red se convierte en ApiError con status 0 y texto genérico', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const error = await solicitar('/x').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toBe(MENSAJE_GENERICO)
  })

  it('mensajeDeError no expone errores técnicos', () => {
    expect(mensajeDeError(new TypeError('x is undefined'))).toBe(MENSAJE_GENERICO)
    expect(mensajeDeError(new ApiError('Mensaje', 400))).toBe('Mensaje')
  })
})

describe('pendientes.rutaListado', () => {
  it('"Todos" omite el parámetro', () => {
    expect(rutaListado({ estado: '', tipo: '' })).toBe('/api/pendientes')
    expect(rutaListado()).toBe('/api/pendientes')
    expect(rutaListado({ estado: 'todos', tipo: 'todos' })).toBe('/api/pendientes')
  })

  it('filtros individuales y combinados', () => {
    expect(rutaListado({ estado: 'pendiente', tipo: '' })).toBe('/api/pendientes?estado=pendiente')
    expect(rutaListado({ estado: '', tipo: 'examen' })).toBe('/api/pendientes?tipo=examen')
    expect(rutaListado({ estado: 'completado', tipo: 'tarea' })).toBe('/api/pendientes?estado=completado&tipo=tarea')
  })
})
