import { useState } from 'react'
import Modal from '../Modal.jsx'
import Campo from '../Campo.jsx'
import { mensajeDeError } from '../../api/http.js'
import { MENSAJES, aTexto, leerNotaObjetivo } from '../../utils/numeros.js'

// Crear (curso = null) o editar nombre y nota objetivo.
// onGuardar(cuerpo) devuelve una promesa. En edición solo se envían los cambios.
export default function CursoFormModal({ curso, onGuardar, onCerrar }) {
  const edicion = Boolean(curso)
  const [nombre, setNombre] = useState(curso?.nombre ?? '')
  const [objetivo, setObjetivo] = useState(edicion ? aTexto(curso.nota_objetivo) : '11')
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    if (guardando) return

    const nombreLimpio = nombre.trim()
    const leido = leerNotaObjetivo(objetivo)
    const nuevos = {
      nombre: nombreLimpio ? null : MENSAJES.nombre,
      objetivo: leido.error,
    }
    setErrores(nuevos)
    if (nuevos.nombre || nuevos.objetivo) return

    let cuerpo = { nombre: nombreLimpio, nota_objetivo: leido.valor }
    if (edicion) {
      cuerpo = {}
      if (nombreLimpio !== curso.nombre) cuerpo.nombre = nombreLimpio
      if (leido.valor !== curso.nota_objetivo) cuerpo.nota_objetivo = leido.valor
      if (Object.keys(cuerpo).length === 0) {
        onCerrar()
        return
      }
    }

    setGuardando(true)
    setErrorEnvio(null)
    try {
      await onGuardar(cuerpo)
    } catch (e) {
      setErrorEnvio(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={edicion ? 'Editar curso' : 'Nuevo curso'} onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={enviar} noValidate>
        <Campo etiqueta="Nombre del curso" error={errores.nombre}>
          {(props) => (
            <input {...props} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              autoComplete="off" required data-autofocus />
          )}
        </Campo>
        <Campo etiqueta="Nota objetivo" error={errores.objetivo} ayuda="Entre 0 y 20, hasta 2 decimales.">
          {(props) => (
            <input {...props} type="text" inputMode="decimal" value={objetivo}
              onChange={(e) => {
                setObjetivo(e.target.value)
                setErrores((prev) => ({ ...prev, objetivo: e.target.value.trim() ? leerNotaObjetivo(e.target.value).error : null }))
              }}
              required />
          )}
        </Campo>
        {errorEnvio && <p className="alerta alerta--error" role="alert">{errorEnvio}</p>}
        <div className="modal__acciones">
          <button type="button" className="boton boton--secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="boton boton--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
