import { useState } from 'react'
import Modal from './Modal.jsx'
import { mensajeDeError } from '../api/http.js'

// Confirmación de eliminación. `onConfirmar` devuelve una promesa; si falla se
// muestra el error y el elemento se mantiene.
export default function ConfirmDialog({ titulo, mensaje, textoConfirmar = 'Eliminar', onConfirmar, onCancelar }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)

  async function confirmar() {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await onConfirmar()
    } catch (e) {
      setError(mensajeDeError(e))
      setOcupado(false)
    }
  }

  return (
    <Modal titulo={titulo} onCerrar={onCancelar} bloqueado={ocupado} rol="alertdialog">
      <p className="confirmacion__texto">{mensaje}</p>
      {error && <p className="alerta alerta--error" role="alert">{error}</p>}
      <div className="modal__acciones">
        <button type="button" className="boton boton--secundario" onClick={onCancelar} disabled={ocupado} data-autofocus>
          Cancelar
        </button>
        <button type="button" className="boton boton--peligro" onClick={confirmar} disabled={ocupado}>
          {ocupado ? 'Eliminando…' : textoConfirmar}
        </button>
      </div>
    </Modal>
  )
}
