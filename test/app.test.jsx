import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import App from '../src/App.jsx'
import Modal from '../src/components/Modal.jsx'
import { respuestaJson, simularFetch } from './fetch-simulado.js'
import { USUARIO_A, guardarSesionDePrueba } from './sesion-prueba.js'

describe('navegación', () => {
  it('abre Mis notas por defecto y alterna con Mis pendientes', async () => {
    guardarSesionDePrueba()
    simularFetch({
      'GET /api/auth/me': () => respuestaJson(USUARIO_A),
      'GET /api/notas/cursos': () => respuestaJson([]),
      'GET /api/pendientes': () => respuestaJson([]),
    })
    const usuario = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis notas' })).toBeInTheDocument()
    expect(screen.getByText('UniPanel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mis notas' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByText('Aún no tienes cursos. Crea el primero.')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Mis pendientes' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Mis pendientes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mis pendientes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Mis notas' })).not.toHaveAttribute('aria-current')
    expect(await screen.findByText('Aún no tienes pendientes.')).toBeInTheDocument()
  })
})

function ConModal() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>Abrir</button>
      {abierto && (
        <Modal titulo="Prueba" onCerrar={() => setAbierto(false)}>
          <input aria-label="Primero" />
          <button type="button">Último</button>
        </Modal>
      )}
    </>
  )
}

describe('Modal', () => {
  it('tiene título, atrapa el foco, cierra con Escape y devuelve el foco', async () => {
    const usuario = userEvent.setup()
    render(<ConModal />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })
    await usuario.click(abrir)

    const dialogo = screen.getByRole('dialog', { name: 'Prueba' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    const primero = screen.getByLabelText('Primero')
    const ultimo = screen.getByRole('button', { name: 'Último' })
    expect(primero).toHaveFocus()

    await usuario.tab()
    expect(ultimo).toHaveFocus()
    await usuario.tab()
    expect(primero).toHaveFocus()
    await usuario.tab({ shift: true })
    expect(ultimo).toHaveFocus()

    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })
})
