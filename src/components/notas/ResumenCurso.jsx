import { useState } from 'react'
import Campo from '../Campo.jsx'
import { mensajeDeError } from '../../api/http.js'
import { aTexto, leerNotaObjetivo } from '../../utils/numeros.js'

// Muestra el resumen tal como lo entrega GET /resumen. No recalcula nada.
const ETIQUETA_OBJETIVO = {
  alcanzado: 'Objetivo alcanzado',
  alcanzable: 'Objetivo alcanzable',
  no_alcanzado: 'Objetivo no alcanzado',
  no_alcanzable: 'Objetivo no alcanzable',
  sin_calculo: 'Sin cálculo todavía',
}

const TONO_OBJETIVO = {
  alcanzado: 'menta',
  alcanzable: 'lavanda',
  no_alcanzado: 'durazno',
  no_alcanzable: 'durazno',
  sin_calculo: 'neutro',
}

function ObjetivoEditable({ notaObjetivo, onGuardar }) {
  const [valor, setValor] = useState(aTexto(notaObjetivo))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    if (guardando) return
    const leido = leerNotaObjetivo(valor)
    if (leido.error) {
      setError(leido.error)
      return
    }
    setError(null)
    if (leido.valor === notaObjetivo) return
    setGuardando(true)
    try {
      await onGuardar(leido.valor)
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="objetivo" onSubmit={enviar} noValidate>
      <Campo etiqueta="Nota objetivo" error={error}>
        {(props) => (
          <input {...props} className="objetivo__entrada" type="text" inputMode="decimal" value={valor}
            onChange={(e) => {
              setValor(e.target.value)
              setError(e.target.value.trim() ? leerNotaObjetivo(e.target.value).error : null)
            }} />
        )}
      </Campo>
      <button type="submit" className="boton boton--secundario" disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar objetivo'}
      </button>
    </form>
  )
}

export default function ResumenCurso({ resumen, onGuardarObjetivo }) {
  const tono = TONO_OBJETIVO[resumen.estado_objetivo] ?? 'neutro'

  return (
    <section className="resumen" aria-label="Resumen del curso">
      <ObjetivoEditable
        key={resumen.nota_objetivo}
        notaObjetivo={resumen.nota_objetivo}
        onGuardar={onGuardarObjetivo}
      />

      <div className="tarjetas">
        <div className="tarjeta-dato">
          <p className="tarjeta-dato__etiqueta">{resumen.es_promedio_final ? 'Promedio final' : 'Aporte acumulado'}</p>
          <p className="tarjeta-dato__valor">
            {resumen.es_promedio_final ? resumen.promedio_final : resumen.aporte_acumulado}
          </p>
          {!resumen.es_promedio_final && (
            <p className="tarjeta-dato__nota">Todavía no es el promedio final.</p>
          )}
        </div>

        {resumen.nota_necesaria !== null && (
          <div className="tarjeta-dato">
            <p className="tarjeta-dato__etiqueta">Nota necesaria</p>
            <p className="tarjeta-dato__valor">{resumen.nota_necesaria}</p>
            {resumen.evaluaciones_pendientes_detalle.length === 1 && (
              <p className="tarjeta-dato__nota">en {resumen.evaluaciones_pendientes_detalle[0].nombre}</p>
            )}
            {resumen.evaluaciones_pendientes_detalle.length > 1 && (
              <p className="tarjeta-dato__nota">
                en cada una de las {resumen.evaluaciones_pendientes_detalle.length} evaluaciones pendientes
              </p>
            )}
          </div>
        )}
      </div>

      <div className={`mensaje mensaje--${tono}`} data-estado={resumen.estado_objetivo}>
        <p className="mensaje__titulo">{ETIQUETA_OBJETIVO[resumen.estado_objetivo] ?? 'Objetivo'}</p>
        <p>{resumen.mensaje_objetivo}</p>
      </div>

      {resumen.mensaje_aprobacion !== null && (
        <div className="mensaje mensaje--neutro" data-estado={resumen.estado_aprobacion}>
          <p className="mensaje__titulo">Aprobación del curso</p>
          <p>{resumen.mensaje_aprobacion}</p>
        </div>
      )}

      {resumen.avisos.length > 0 && (
        <ul className="avisos" aria-label="Avisos">
          {resumen.avisos.map((aviso) => (
            <li key={aviso.codigo} className="aviso"><span aria-hidden="true">ⓘ </span>{aviso.mensaje}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
