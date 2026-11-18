import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import { MENSAJE_SESION_VENCIDA, registrarCierreDeSesion, solicitar } from '../src/api/http.js'
import { guardarSesion, leerSesion } from '../src/api/sesion.js'
import { respuestaJson, simularFetch } from './fetch-simulado.js'
import { USUARIO_A, USUARIO_B, guardarSesionDePrueba, tokenDePrueba } from './sesion-prueba.js'

const MSG_VENCIDA = 'La sesión venció. Inicia sesión de nuevo.'
const MSG_INVALIDA = 'La sesión no es válida. Inicia sesión de nuevo.'

function respuestaLogin(usuario) {
  return respuestaJson({ token: tokenDePrueba({ sub: String(usuario.id) }), tipo: 'Bearer', expira_en: 28800, usuario })
}

async function llenarLogin(usuario, email = 'ana@ejemplo.com', password = 'clave segura') {
  await usuario.type(screen.getByLabelText('Email'), email)
  await usuario.type(screen.getByLabelText('Contraseña'), password)
}

describe('http y sesión', () => {
  it('envía Authorization: Bearer con la sesión y no en registro/login', async () => {
    const token = guardarSesionDePrueba()
    const { llamadas, fn } = simularFetch({
      'GET /api/notas/cursos': () => respuestaJson([]),
      'POST /api/auth/login': () => respuestaLogin(USUARIO_A),
    })
    await solicitar('/api/notas/cursos')
    await solicitar('/api/auth/login', { method: 'POST', body: {}, autenticada: false })
    expect(fn.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${token}`)
    expect(fn.mock.calls[1][1].headers.Authorization).toBeUndefined()
    expect(llamadas).toHaveLength(2)
  })

  it('un 401 borra la sesión y avisa con el mensaje de la API', async () => {
    guardarSesionDePrueba()
    simularFetch({ 'GET /api/pendientes': () => respuestaJson({ error: MSG_INVALIDA }, 401) })
    const avisado = vi.fn()
    const quitar = registrarCierreDeSesion(avisado)
    const error = await solicitar('/api/pendientes').catch((e) => e)
    quitar()
    expect(error.status).toBe(401)
    expect(avisado).toHaveBeenCalledWith(MSG_INVALIDA)
    expect(leerSesion()).toBeNull()
    expect(sessionStorage.getItem('unipanel.sesion')).toBeNull()
  })

  it('con la sesión vencida no llama a la API y cierra la sesión', async () => {
    guardarSesion(tokenDePrueba({ expSegundos: -10 }))
    const { fn } = simularFetch({})
    const avisado = vi.fn()
    const quitar = registrarCierreDeSesion(avisado)
    const error = await solicitar('/api/notas/cursos').catch((e) => e)
    quitar()
    expect(fn).not.toHaveBeenCalled()
    expect(error.status).toBe(401)
    expect(avisado).toHaveBeenCalledWith(MENSAJE_SESION_VENCIDA)
    expect(leerSesion()).toBeNull()
  })

  it('un 401 de login (credenciales) no cierra una sesión ni dispara el aviso', async () => {
    simularFetch({ 'POST /api/auth/login': () => respuestaJson({ error: 'Email o contraseña incorrectos.' }, 401) })
    const avisado = vi.fn()
    const quitar = registrarCierreDeSesion(avisado)
    await expect(solicitar('/api/auth/login', { method: 'POST', body: {}, autenticada: false }))
      .rejects.toThrow('Email o contraseña incorrectos.')
    quitar()
    expect(avisado).not.toHaveBeenCalled()
  })
})

describe('App con autenticación', () => {
  it('sin sesión muestra Iniciar sesión y no llama a las API de datos', async () => {
    const { fn } = simularFetch({})
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mis notas' })).not.toBeInTheDocument()
    expect(fn).not.toHaveBeenCalled()
  })

  it('login: muestra Entrando…, evita envíos duplicados y entra con el nombre del usuario', async () => {
    let liberar
    const { llamadas } = simularFetch({
      'POST /api/auth/login': () => new Promise((r) => { liberar = () => r(respuestaLogin(USUARIO_A)) }),
      'GET /api/notas/cursos': () => respuestaJson([]),
    })
    const usuario = userEvent.setup()
    render(<App />)
    await llenarLogin(usuario)
    const boton = screen.getByRole('button', { name: 'Entrar' })
    await usuario.click(boton)
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: 'Entrando…' }))
    expect(llamadas.filter((l) => l.url === '/api/auth/login')).toHaveLength(1)
    expect(llamadas[0].body).toEqual({ email: 'ana@ejemplo.com', password: 'clave segura' })
    liberar()

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis notas' })).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(leerSesion()?.token).toMatch(/\./)
    // El token nunca se muestra.
    expect(document.body.textContent).not.toContain(leerSesion().token)
  })

  it('login con credenciales incorrectas muestra el error de la API y conserva los datos', async () => {
    simularFetch({ 'POST /api/auth/login': () => respuestaJson({ error: 'Email o contraseña incorrectos.' }, 401) })
    const usuario = userEvent.setup()
    render(<App />)
    await llenarLogin(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(screen.getByLabelText('Email')).toHaveValue('ana@ejemplo.com')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('valida en el cliente antes de enviar', async () => {
    const { fn } = simularFetch({})
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(screen.getByRole('button', { name: 'Crear una cuenta' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Crear cuenta' })).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Email'), 'ana@ejemplo.com')
    await usuario.type(screen.getByLabelText('Contraseña'), 'corta')
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText('El nombre debe tener entre 1 y 100 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('La contraseña debe tener entre 8 y 128 caracteres.')).toBeInTheDocument()
    expect(fn).not.toHaveBeenCalled()
  })

  it('registro: crea la cuenta, hace login automático y entra', async () => {
    const { llamadas } = simularFetch({
      'POST /api/auth/registro': () => respuestaJson(USUARIO_A, 201),
      'POST /api/auth/login': () => respuestaLogin(USUARIO_A),
      'GET /api/notas/cursos': () => respuestaJson([]),
    })
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(screen.getByRole('button', { name: 'Crear una cuenta' }))
    await usuario.type(screen.getByLabelText('Nombre'), '  Ana Pérez ')
    await llenarLogin(usuario, ' Ana@Ejemplo.com ')
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis notas' })).toBeInTheDocument()
    expect(llamadas[0]).toMatchObject({ method: 'POST', url: '/api/auth/registro', body: { nombre: 'Ana Pérez', email: 'Ana@Ejemplo.com', password: 'clave segura' } })
    expect(llamadas[1]).toMatchObject({ method: 'POST', url: '/api/auth/login' })
  })

  it('registro con email repetido muestra el error de la API', async () => {
    simularFetch({ 'POST /api/auth/registro': () => respuestaJson({ error: 'Ya existe una cuenta con ese email.' }, 409) })
    const usuario = userEvent.setup()
    render(<App />)
    await usuario.click(screen.getByRole('button', { name: 'Crear una cuenta' }))
    await usuario.type(screen.getByLabelText('Nombre'), 'Ana')
    await llenarLogin(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese email.')
  })

  it('con sesión guardada consulta /me y entra; si /me da 401 vuelve al login con el mensaje', async () => {
    guardarSesionDePrueba()
    simularFetch({
      'GET /api/auth/me': () => respuestaJson(USUARIO_A),
      'GET /api/notas/cursos': () => respuestaJson([]),
    })
    const { unmount } = render(<App />)
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    unmount()

    guardarSesionDePrueba()
    simularFetch({ 'GET /api/auth/me': () => respuestaJson({ error: MSG_INVALIDA }, 401) })
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(MSG_INVALIDA)
    expect(leerSesion()).toBeNull()
  })

  it('una sesión guardada ya vencida va al login sin llamar a la API', async () => {
    guardarSesionDePrueba({ expSegundos: -60 })
    const { fn } = simularFetch({})
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(MSG_VENCIDA)
    expect(fn).not.toHaveBeenCalled()
  })

  it('un 401 al cargar datos devuelve al login con el mensaje de la API', async () => {
    guardarSesionDePrueba()
    simularFetch({
      'GET /api/auth/me': () => respuestaJson(USUARIO_A),
      'GET /api/notas/cursos': () => respuestaJson({ error: MSG_VENCIDA }, 401),
    })
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(MSG_VENCIDA)
  })

  it('cerrar sesión descarta los datos: otro usuario no ve los cursos del anterior', async () => {
    // Respuestas según el usuario de la sesión en curso.
    let usuarioActual = USUARIO_A
    const cursosDe = { 1: [{ id: 10, nombre: 'Curso de Ana', nota_objetivo: 11 }], 2: [] }
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url === '/api/auth/login') return respuestaLogin(usuarioActual)
      if (url === '/api/notas/cursos') return respuestaJson(cursosDe[usuarioActual.id])
      if (url === '/api/notas/cursos/10/evaluaciones') return respuestaJson([])
      if (url === '/api/notas/cursos/10/resumen') {
        return respuestaJson({
          curso_id: 10, nota_objetivo: 11, nota_minima_aprobatoria: 11, suma_pesos: 0, peso_faltante: 100,
          pesos_completos: false, evaluaciones_pendientes: 0, evaluacion_pendiente: null, aporte_acumulado: 0,
          es_promedio_final: false, promedio_final: null, nota_necesaria: null, estado_objetivo: 'sin_calculo',
          mensaje_objetivo: 'Todavía no se puede calcular cuánto necesitas para tu objetivo de 11.',
          estado_aprobacion: null, mensaje_aprobacion: null,
          avisos: [{ codigo: 'SIN_EVALUACIONES', mensaje: 'El curso aún no tiene evaluaciones.' }],
        })
      }
      throw new Error(`Ruta no simulada: ${url}`)
    }))

    const usuario = userEvent.setup()
    render(<App />)
    await llenarLogin(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Curso de Ana' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(leerSesion()).toBeNull()
    expect(screen.queryByText('Curso de Ana')).not.toBeInTheDocument()

    usuarioActual = USUARIO_B
    await llenarLogin(usuario, 'beto@ejemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Aún no tienes cursos. Crea el primero.')).toBeInTheDocument()
    expect(screen.getByText('Beto Ruiz')).toBeInTheDocument()
    expect(screen.queryByText('Curso de Ana')).not.toBeInTheDocument()
  })
})
