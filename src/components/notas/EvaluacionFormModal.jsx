import { useState } from 'react'
import Modal from '../Modal.jsx'
import Campo from '../Campo.jsx'
import { mensajeDeError } from '../../api/http.js'
import { MENSAJES, aTexto, leerNota, leerPeso } from '../../utils/numeros.js'

// Crear (evaluacion = null) o editar una evaluación.
// Nota vacía → null (pendiente). Una nota 0 se conserva como 0.
export default function EvaluacionFormModal({ evaluacion, onGuardar, onCerrar }) {
  const edicion = Boolean(evaluacion)
  const [nombre, setNombre] = useState(evaluacion?.nombre ?? '')
  const [peso, setPeso] = useState(aTexto(evaluacion?.peso_porcentaje))
  const [nota, setNota] = useState(aTexto(evaluacion?.nota))
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    if (guardando) return

    const nombreLimpio = nombre.trim()
    const pesoLeido = leerPeso(peso)
    const notaLeida = leerNota(nota)
    const nuevos = {
      nombre: nombreLimpio ? null : MENSAJES.nombre,
      peso: pesoLeido.error,
      nota: notaLeida.error,
    }
    setErrores(nuevos)
    if (nuevos.nombre || nuevos.peso || nuevos.nota) return

    let cuerpo = { nombre: nombreLimpio, peso_porcentaje: pesoLeido.valor, nota: notaLeida.valor }
    if (edicion) {
      cuerpo = {}
      if (nombreLimpio !== evaluacion.nombre) cuerpo.nombre = nombreLimpio
      if (pesoLeido.valor !== evaluacion.peso_porcentaje) cuerpo.peso_porcentaje = pesoLeido.valor
      if (notaLeida.valor !== evaluacion.nota) cuerpo.nota = notaLeida.valor
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

  const avisarNota = (texto) =>
    setErrores((prev) => ({ ...prev, nota: leerNota(texto).error }))

  return (
    <Modal titulo={edicion ? 'Editar evaluación' : 'Nueva evaluación'} onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={enviar} noValidate>
        <Campo etiqueta="Nombre" error={errores.nombre}>
          {(props) => (
            <input {...props} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              autoComplete="off" required data-autofocus />
          )}
        </Campo>
        <Campo etiqueta="Peso porcentual (%)" error={errores.peso} ayuda="Mayor que 0 y hasta 100, hasta 2 decimales.">
          {(props) => (
            <input {...props} type="text" inputMode="decimal" value={peso}
              onChange={(e) => setPeso(e.target.value)} required />
          )}
        </Campo>
        <Campo etiqueta="Nota (opcional)" error={errores.nota} ayuda="Entre 0 y 20. Déjala vacía si está pendiente.">
          {(props) => (
            <input {...props} type="text" inputMode="decimal" value={nota}
              onChange={(e) => { setNota(e.target.value); avisarNota(e.target.value) }} />
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
