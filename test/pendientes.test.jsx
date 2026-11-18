import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PendientesPage from '../src/pages/PendientesPage.jsx'
import { respuesta204, respuestaJson, simularFetch } from './fetch-simulado.js'

// Forma de pendientes-service/SPEC.md §2.
const pendiente = (extra = {}) => ({
  id: 1,
  titulo: 'Informe de laboratorio',
  descripcion: null,
  curso_nombre: 'Física I',
  tipo: 'tarea',
  fecha_limite: '2026-12-01T23:59:00-05:00',
  estado: 'pendiente',
  vencido: false,
  ...extra,
})

function diferido() {
  let resolver
  const promesa = new Promise((r) => { resolver = r })
  return { promesa, resolver }
}

describe('Mis pendientes', () => {
  it('sin pendientes y sin resultados para los filtros; filtros combinados omiten "Todos"', async () => {
    const { llamadas } = simularFetch({
      'GET /api/pendientes': () => respuestaJson([]),
      'GET /api/pendientes?estado=pendiente': () => respuestaJson([]),
      'GET /api/pendientes?estado=pendiente&tipo=examen': () => respuestaJson([]),
      'GET /api/pendientes?tipo=examen': () => respuestaJson([]),
    })
    const usuario = userEvent.setup()
    render(<PendientesPage />)

    expect(await screen.findByText('Aún no tienes pendientes.')).toBeInTheDocument()
    expect(screen.getByText('Fechas en hora de Perú.')).toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Estado'), 'pendiente')
    expect(await screen.findByText('No hay pendientes con estos filtros.')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'examen')
    await usuario.selectOptions(screen.getByLabelText('Estado'), '')
    await screen.findByText('No hay pendientes con estos filtros.')

    expect(llamadas.map((l) => l.url)).toEqual([
      '/api/pendientes',
      '/api/pendientes?estado=pendiente',
      '/api/pendientes?estado=pendiente&tipo=examen',
      '/api/pendientes?tipo=examen',
    ])
  })

  it('muestra los datos de la API en su orden, en hora de Perú y con Vencido', async () => {
    simularFetch({
      'GET /api/pendientes': () => respuestaJson([
        pendiente({ id: 2, titulo: 'Examen parcial', tipo: 'examen', vencido: true, fecha_limite: '2026-11-01T08:00:00-05:00' }),
        pendiente({ id: 1, estado: 'completado' }),
      ]),
    })
    render(<PendientesPage />)

    const filas = await screen.findAllByRole('row')
    expect(within(filas[1]).getByText('Examen parcial')).toBeInTheDocument()
    expect(within(filas[1]).getByText('Vencido')).toBeInTheDocument()
    expect(within(filas[1]).getByText('Pendiente')).toBeInTheDocument()
    expect(within(filas[1]).getByText(/01\/11\/2026.*08:00/)).toBeInTheDocument()
    expect(within(filas[2]).getByText('Completado')).toBeInTheDocument()
    expect(within(filas[2]).getByRole('checkbox')).toBeChecked()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2) // sin casilla en la cabecera
  })

  it('la casilla hace PATCH { estado }, se deshabilita mientras guarda y vuelve a consultar con los filtros', async () => {
    let estado = 'pendiente'
    const espera = diferido()
    const { llamadas } = simularFetch({
      'GET /api/pendientes': () => respuestaJson([pendiente({ estado })]),
      'PATCH /api/pendientes/1': async ({ body }) => {
        await espera.promesa
        estado = body.estado
        return respuestaJson(pendiente({ estado }))
      },
    })
    const usuario = userEvent.setup()
    render(<PendientesPage />)

    const casilla = await screen.findByRole('checkbox', { name: 'Marcar como completado Informe de laboratorio' })
    await usuario.click(casilla)
    expect(casilla).toBeDisabled()
    espera.resolver()

    const reabrir = await screen.findByRole('checkbox', { name: 'Reabrir Informe de laboratorio' })
    await waitFor(() => expect(reabrir).toBeEnabled())
    expect(reabrir).toBeChecked()
    expect(llamadas.filter((l) => l.method === 'PATCH')[0].body).toEqual({ estado: 'completado' })
    expect(llamadas.filter((l) => l.method === 'GET')).toHaveLength(2)

    await usuario.click(reabrir)
    await waitFor(() => expect(llamadas.filter((l) => l.method === 'PATCH')).toHaveLength(2))
    expect(llamadas.filter((l) => l.method === 'PATCH')[1].body).toEqual({ estado: 'pendiente' })
  })

  it('si el cambio de estado falla conserva el estado anterior y muestra el error', async () => {
    simularFetch({
      'GET /api/pendientes': () => respuestaJson([pendiente()]),
      'PATCH /api/pendientes/1': () => respuestaJson({ error: 'No se encontró el pendiente.' }, 404),
    })
    const usuario = userEvent.setup()
    render(<PendientesPage />)

    const casilla = await screen.findByRole('checkbox')
    await usuario.click(casilla)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el pendiente.')
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeEnabled())
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('eliminar pide confirmación con el texto de la SPEC y solo envía DELETE al elegir Eliminar', async () => {
    let lista = [pendiente()]
    const { llamadas } = simularFetch({
      'GET /api/pendientes': () => respuestaJson(lista),
      'DELETE /api/pendientes/1': () => {
        lista = []
        return respuesta204()
      },
    })
    const usuario = userEvent.setup()
    render(<PendientesPage />)

    await usuario.click(await screen.findByRole('button', { name: 'Eliminar Informe de laboratorio' }))
    let dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent('¿Eliminar este pendiente? Esta acción no se puede deshacer.')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(llamadas.some((l) => l.method === 'DELETE')).toBe(false)
    expect(screen.getByText('Informe de laboratorio')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Eliminar Informe de laboratorio' }))
    dialogo = screen.getByRole('alertdialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Aún no tienes pendientes.')).toBeInTheDocument()
  })

  it('si DELETE falla mantiene el elemento y muestra el error', async () => {
    simularFetch({
      'GET /api/pendientes': () => respuestaJson([pendiente()]),
      'DELETE /api/pendientes/1': () => new Response(null, { status: 500 }),
    })
    const usuario = userEvent.setup()
    render(<PendientesPage />)

    await usuario.click(await screen.findByRole('button', { name: 'Eliminar Informe de laboratorio' }))
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('No se pudo completar la operación. Inténtalo nuevamente.')).toBeInTheDocument()
    expect(screen.getByText('Informe de laboratorio')).toBeInTheDocument()
  })

  it('crear envía fecha con -05:00, descripción vacía como null y sin estado', async () => {
    const { llamadas } = simularFetch({
      'GET /api/pendientes': () => respuestaJson([]),
      'POST /api/pendientes': ({ body }) => respuestaJson(pendiente({ id: 9, ...body }), 201),
    })
    const usuario = userEvent.setup()
    render(<PendientesPage />)

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo pendiente' }))
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo pendiente' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }))
    expect(within(dialogo).getByText('El título debe tener entre 1 y 120 caracteres.')).toBeInTheDocument()
    expect(llamadas.some((l) => l.method === 'POST')).toBe(false)

    await usuario.type(within(dialogo).getByLabelText('Título'), '  Examen parcial ')
    await usuario.type(within(dialogo).getByLabelText('Curso'), 'Cálculo I')
    await usuario.selectOptions(within(dialogo).getByLabelText('Tipo'), 'examen')
    await usuario.type(within(dialogo).getByLabelText('Fecha y hora límite'), '2026-12-05T08:00')
    await usuario.type(within(dialogo).getByLabelText('Descripción (opcional)'), '   ')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(llamadas.find((l) => l.method === 'POST').body).toEqual({
      titulo: 'Examen parcial',
      descripcion: null,
      curso_nombre: 'Cálculo I',
      tipo: 'examen',
      fecha_limite: '2026-12-05T08:00:00-05:00',
    })
  })

  it('editar sin cambios cierra sin PATCH; con cambios envía solo lo modificado', async () => {
    const { llamadas } = simularFetch({
      'GET /api/pendientes': () => respuestaJson([pendiente({ fecha_limite: '2026-12-01T23:59:00-05:00' })]),
      'PATCH /api/pendientes/1': ({ body }) => respuestaJson(pendiente(body)),
    })
    const usuario = userEvent.setup()
    render(<PendientesPage />)

    const editar = await screen.findByRole('button', { name: 'Editar Informe de laboratorio' })
    await usuario.click(editar)
    const dialogo = screen.getByRole('dialog', { name: 'Editar pendiente' })
    expect(within(dialogo).getByLabelText('Fecha y hora límite')).toHaveValue('2026-12-01T23:59')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(llamadas.some((l) => l.method === 'PATCH')).toBe(false)
    expect(editar).toHaveFocus()

    await usuario.click(editar)
    const titulo = within(screen.getByRole('dialog')).getByLabelText('Título')
    await usuario.clear(titulo)
    await usuario.type(titulo, 'Informe final')
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(llamadas.some((l) => l.method === 'PATCH')).toBe(true))
    expect(llamadas.find((l) => l.method === 'PATCH').body).toEqual({ titulo: 'Informe final' })
  })
})
