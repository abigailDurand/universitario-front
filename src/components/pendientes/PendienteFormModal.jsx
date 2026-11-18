import { useState } from 'react'
import Modal from '../Modal.jsx'
import Campo from '../Campo.jsx'
import { mensajeDeError } from '../../api/http.js'
import { entradaPeruAIso, isoAEntradaPeru } from '../../utils/fechas.js'

// Límites y textos de pendientes-service/SPEC.md §1 y §3.
const LIMITES = { titulo: 120, curso: 100, descripcion: 1000 }
const MENSAJES = {
  titulo: 'El título debe tener entre 1 y 120 caracteres.',
  curso: 'El nombre del curso debe tener entre 1 y 100 caracteres.',
  descripcion: 'La descripción debe tener máximo 1000 caracteres.',
  fecha: 'La fecha y hora límite son obligatorias.',
}

// Longitud en caracteres Unicode, como la API.
const largo = (texto) => [...texto].length

// Valores del formulario → cuerpo completo (sin estado, id ni vencido).
function construirCuerpo(valores) {
  const descripcion = valores.descripcion.trim()
  return {
    titulo: valores.titulo.trim(),
    descripcion: descripcion === '' ? null : descripcion,
    curso_nombre: valores.curso.trim(),
    tipo: valores.tipo,
    fecha_limite: entradaPeruAIso(valores.fecha),
  }
}

function validar(valores) {
  const titulo = largo(valores.titulo.trim())
  const curso = largo(valores.curso.trim())
  return {
    titulo: titulo < 1 || titulo > LIMITES.titulo ? MENSAJES.titulo : null,
    curso: curso < 1 || curso > LIMITES.curso ? MENSAJES.curso : null,
    descripcion: largo(valores.descripcion.trim()) > LIMITES.descripcion ? MENSAJES.descripcion : null,
    fecha: entradaPeruAIso(valores.fecha) ? null : MENSAJES.fecha,
  }
}

// En edición solo se envían los campos modificados.
function cambiosDePendiente(original, cuerpo) {
  const cambios = {}
  for (const [campo, valor] of Object.entries(cuerpo)) {
    const anterior = campo === 'fecha_limite'
      ? entradaPeruAIso(isoAEntradaPeru(original.fecha_limite))
      : original[campo]
    if (valor !== anterior) cambios[campo] = valor
  }
  return cambios
}

export default function PendienteFormModal({ pendiente, onGuardar, onCerrar }) {
  const edicion = Boolean(pendiente)
  const [valores, setValores] = useState({
    titulo: pendiente?.titulo ?? '',
    curso: pendiente?.curso_nombre ?? '',
    tipo: pendiente?.tipo ?? 'tarea',
    fecha: pendiente ? isoAEntradaPeru(pendiente.fecha_limite) : '',
    descripcion: pendiente?.descripcion ?? '',
  })
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo) => (evento) => setValores((v) => ({ ...v, [campo]: evento.target.value }))

  async function enviar(evento) {
    evento.preventDefault()
    if (guardando) return

    const nuevos = validar(valores)
    setErrores(nuevos)
    if (Object.values(nuevos).some(Boolean)) return

    let cuerpo = construirCuerpo(valores)
    if (edicion) {
      cuerpo = cambiosDePendiente(pendiente, cuerpo)
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
    <Modal titulo={edicion ? 'Editar pendiente' : 'Nuevo pendiente'} onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={enviar} noValidate>
        <Campo etiqueta="Título" error={errores.titulo} ayuda="Máximo 120 caracteres.">
          {(props) => (
            <input {...props} type="text" value={valores.titulo} onChange={cambiar('titulo')}
              autoComplete="off" required data-autofocus />
          )}
        </Campo>
        <Campo etiqueta="Curso" error={errores.curso} ayuda="Máximo 100 caracteres.">
          {(props) => (
            <input {...props} type="text" value={valores.curso} onChange={cambiar('curso')} autoComplete="off" required />
          )}
        </Campo>
        <div className="campos-fila">
          <Campo etiqueta="Tipo">
            {(props) => (
              <select {...props} value={valores.tipo} onChange={cambiar('tipo')}>
                <option value="tarea">Tarea</option>
                <option value="examen">Examen</option>
              </select>
            )}
          </Campo>
          <Campo etiqueta="Fecha y hora límite" error={errores.fecha} ayuda="Hora de Perú.">
            {(props) => (
              <input {...props} type="datetime-local" step="60" value={valores.fecha} onChange={cambiar('fecha')} required />
            )}
          </Campo>
        </div>
        <Campo etiqueta="Descripción (opcional)" error={errores.descripcion} ayuda="Máximo 1000 caracteres.">
          {(props) => (
            <textarea {...props} rows={3} value={valores.descripcion} onChange={cambiar('descripcion')} />
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
