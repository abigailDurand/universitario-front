import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotasPage from '../src/pages/NotasPage.jsx'
import { respuesta204, respuestaJson, simularFetch } from './fetch-simulado.js'

// Formas de respuesta según notas-service/SPEC.md §1 y §4.
function resumen(cursoId, extra = {}) {
  return {
    curso_id: cursoId,
    nota_objetivo: 11,
    nota_minima_aprobatoria: 11,
    suma_pesos: 100,
    peso_faltante: 0,
    pesos_completos: true,
    evaluaciones_pendientes: 1,
    evaluacion_pendiente: { id: 3, nombre: 'Final', peso_porcentaje: 40 },
    aporte_acumulado: 7.2,
    es_promedio_final: false,
    promedio_final: null,
    nota_necesaria: 9.5,
    estado_objetivo: 'alcanzable',
    mensaje_objetivo: 'Necesitas 9.5 en Final para llegar a tu objetivo de 11.',
    estado_aprobacion: null,
    mensaje_aprobacion: null,
    avisos: [{ codigo: 'APORTE_NO_FINAL', mensaje: 'El aporte acumulado (7.2) todavía no es el promedio final.' }],
    ...extra,
  }
}

const EVALUACIONES = [
  { id: 1, curso_id: 1, nombre: 'Prácticas', peso_porcentaje: 30, nota: 14 },
  { id: 2, curso_id: 1, nombre: 'Parcial', peso_porcentaje: 30, nota: 0 },
  { id: 3, curso_id: 1, nombre: 'Final', peso_porcentaje: 40, nota: null },
]

describe('Mis notas', () => {
  it('sin cursos muestra el estado vacío', async () => {
    simularFetch({ 'GET /api/notas/cursos': () => respuestaJson([]) })
    render(<NotasPage />)
    expect(await screen.findByText('Aún no tienes cursos. Crea el primero.')).toBeInTheDocument()
  })

  it('selecciona el primer curso y muestra el resumen de la API sin recalcular', async () => {
    simularFetch({
      'GET /api/notas/cursos': () => respuestaJson([
        { id: 1, nombre: 'Cálculo I', nota_objetivo: 11 },
        { id: 2, nombre: 'Física', nota_objetivo: 14 },
      ]),
      'GET /api/notas/cursos/1/evaluaciones': () => respuestaJson(EVALUACIONES),
      'GET /api/notas/cursos/1/resumen': () => respuestaJson(resumen(1)),
    })
    render(<NotasPage />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Cálculo I' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cálculo I' })).toHaveAttribute('aria-current', 'true')
    expect(await screen.findByText('Aporte acumulado')).toBeInTheDocument()
    expect(screen.getByText('Todavía no es el promedio final.')).toBeInTheDocument()
    expect(screen.getByText('Nota necesaria')).toBeInTheDocument()
    expect(screen.getByText('Necesitas 9.5 en Final para llegar a tu objetivo de 11.')).toBeInTheDocument()
    expect(screen.getByText('El aporte acumulado (7.2) todavía no es el promedio final.')).toBeInTheDocument()
    expect(screen.getByText('Total registrado: 100 %')).toBeInTheDocument()

    const filas = screen.getAllByRole('row')
    expect(within(filas[2]).getByText('0')).toBeInTheDocument() // nota 0 se muestra como 0
    expect(within(filas[3]).getByText('Pendiente')).toBeInTheDocument()
  })

  it('promedio final, nota necesaria 0 y aprobación separada del objetivo', async () => {
    simularFetch({
      'GET /api/notas/cursos': () => respuestaJson([{ id: 1, nombre: 'Cálculo I', nota_objetivo: 11 }]),
      'GET /api/notas/cursos/1/evaluaciones': () => respuestaJson([]),
      'GET /api/notas/cursos/1/resumen': () => respuestaJson(resumen(1, {
        es_promedio_final: true,
        promedio_final: 15,
        aporte_acumulado: 15,
        evaluaciones_pendientes: 0,
        evaluacion_pendiente: null,
        nota_necesaria: 0,
        estado_objetivo: 'alcanzado',
        mensaje_objetivo: 'Ya alcanzaste tu objetivo de 11.',
        estado_aprobacion: 'aprobado',
        mensaje_aprobacion: 'Aprobaste el curso con 15.',
        avisos: [],
      })),
    })
    render(<NotasPage />)

    expect(await screen.findByText('Promedio final')).toBeInTheDocument()
    expect(screen.queryByText('Todavía no es el promedio final.')).not.toBeInTheDocument()
    expect(screen.getByText('Nota necesaria')).toBeInTheDocument()
    expect(screen.getByText('Nota necesaria').parentElement).toHaveTextContent('0')
    expect(screen.getByText('Ya alcanzaste tu objetivo de 11.').closest('.mensaje')).toHaveClass('mensaje--menta')
    expect(screen.getByText('Aprobaste el curso con 15.')).toBeInTheDocument()
    expect(screen.getByText('Este curso aún no tiene evaluaciones.')).toBeInTheDocument()
  })

  it('no muestra la nota necesaria cuando es null', async () => {
    simularFetch({
      'GET /api/notas/cursos': () => respuestaJson([{ id: 1, nombre: 'Cálculo I', nota_objetivo: 11 }]),
      'GET /api/notas/cursos/1/evaluaciones': () => respuestaJson([]),
      'GET /api/notas/cursos/1/resumen': () => respuestaJson(resumen(1, {
        nota_necesaria: null, estado_objetivo: 'sin_calculo', mensaje_objetivo: 'Todavía no se puede calcular.',
      })),
    })
    render(<NotasPage />)
    expect(await screen.findByText('Todavía no se puede calcular.')).toBeInTheDocument()
    expect(screen.queryByText('Nota necesaria')).not.toBeInTheDocument()
  })

  it('eliminar el curso seleccionado pide confirmación y selecciona el primero restante', async () => {
    let cursos = [
      { id: 1, nombre: 'Cálculo I', nota_objetivo: 11 },
      { id: 2, nombre: 'Física', nota_objetivo: 14 },
    ]
    const { llamadas } = simularFetch({
      'GET /api/notas/cursos': () => respuestaJson(cursos),
      'GET /api/notas/cursos/1/evaluaciones': () => respuestaJson([]),
      'GET /api/notas/cursos/1/resumen': () => respuestaJson(resumen(1)),
      'GET /api/notas/cursos/2/evaluaciones': () => respuestaJson([]),
      'GET /api/notas/cursos/2/resumen': () => respuestaJson(resumen(2)),
      'DELETE /api/notas/cursos/1': () => {
        cursos = cursos.filter((c) => c.id !== 1)
        return respuesta204()
      },
    })
    const usuario = userEvent.setup()
    render(<NotasPage />)

    await usuario.click(await screen.findByRole('button', { name: 'Eliminar curso Cálculo I' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Eliminar curso' })
    expect(dialogo).toHaveTextContent('¿Eliminar este curso y sus evaluaciones? Esta acción no se puede deshacer.')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(llamadas.some((l) => l.method === 'DELETE')).toBe(false)

    await usuario.click(screen.getByRole('button', { name: 'Eliminar curso Cálculo I' }))
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Física' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cálculo I' })).not.toBeInTheDocument()
  })

  it('crear evaluación envía nota vacía como null y actualiza el resumen', async () => {
    let evaluaciones = []
    const { llamadas } = simularFetch({
      'GET /api/notas/cursos': () => respuestaJson([{ id: 1, nombre: 'Cálculo I', nota_objetivo: 11 }]),
      'GET /api/notas/cursos/1/evaluaciones': () => respuestaJson(evaluaciones),
      'GET /api/notas/cursos/1/resumen': () => respuestaJson(resumen(1, { suma_pesos: evaluaciones.length ? 40 : 0 })),
      'POST /api/notas/cursos/1/evaluaciones': ({ body }) => {
        evaluaciones = [{ id: 5, curso_id: 1, ...body }]
        return respuestaJson(evaluaciones[0], 201)
      },
    })
    const usuario = userEvent.setup()
    render(<NotasPage />)

    await usuario.click(await screen.findByRole('button', { name: 'Evaluación' }))
    await usuario.type(screen.getByLabelText('Nombre'), '  Final  ')
    await usuario.type(screen.getByLabelText('Peso porcentual (%)'), '40')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Total registrado: 40 %')).toBeInTheDocument()
    const post = llamadas.find((l) => l.method === 'POST')
    expect(post.body).toEqual({ nombre: 'Final', peso_porcentaje: 40, nota: null })
  })

  it('valida en el cliente y conserva los datos si el backend responde error', async () => {
    simularFetch({
      'GET /api/notas/cursos': () => respuestaJson([]),
      'POST /api/notas/cursos': () => respuestaJson({ error: 'El nombre es obligatorio.' }, 400),
    })
    const usuario = userEvent.setup()
    render(<NotasPage />)

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo curso' }))
    expect(screen.getByLabelText('Nota objetivo')).toHaveValue('11')
    await usuario.clear(screen.getByLabelText('Nota objetivo'))
    await usuario.type(screen.getByLabelText('Nota objetivo'), '21')
    expect(screen.getByText('La nota objetivo debe ser un número entre 0 y 20.')).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText('Nota objetivo'))
    await usuario.type(screen.getByLabelText('Nota objetivo'), '14.5')
    await usuario.type(screen.getByLabelText('Nombre del curso'), 'Química')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre es obligatorio.')
    expect(screen.getByLabelText('Nombre del curso')).toHaveValue('Química')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('error de conexión con Reintentar', async () => {
    let falla = true
    simularFetch({
      'GET /api/notas/cursos': () => {
        if (falla) throw new TypeError('Failed to fetch')
        return respuestaJson([])
      },
    })
    const usuario = userEvent.setup()
    render(<NotasPage />)

    expect(await screen.findByText('No se pudo completar la operación. Inténtalo nuevamente.')).toBeInTheDocument()
    falla = false
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no tienes cursos. Crea el primero.')).toBeInTheDocument()
  })
})
