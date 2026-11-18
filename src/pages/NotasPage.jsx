// Pantalla "Mis notas": cursos a la izquierda, detalle del curso a la derecha.
// Consume uni-notas-api (src/api/notas.js). No calcula notas: el resumen viene de la API.
import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/notas.js'
import { mensajeDeError } from '../api/http.js'
import StatusMessage from '../components/StatusMessage.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import CursoFormModal from '../components/notas/CursoFormModal.jsx'
import EvaluacionFormModal from '../components/notas/EvaluacionFormModal.jsx'
import ResumenCurso from '../components/notas/ResumenCurso.jsx'
import { IconoEditar, IconoEliminar, IconoMas } from '../components/Iconos.jsx'

const MENSAJE_ELIMINAR_CURSO = '¿Eliminar este curso y sus evaluaciones? Esta acción no se puede deshacer.'
const MENSAJE_ELIMINAR_EVALUACION = '¿Eliminar esta evaluación? Esta acción no se puede deshacer.'

function elegirCurso(cursos, preferido) {
  if (cursos.some((c) => c.id === preferido)) return preferido
  return cursos.length > 0 ? cursos[0].id : null
}

export default function NotasPage() {
  const [cursos, setCursos] = useState({ estado: 'cargando', datos: [], error: null })
  const [seleccionado, setSeleccionado] = useState(null)
  const [detalle, setDetalle] = useState({ estado: 'cargando', evaluaciones: [], resumen: null, error: null })
  const [dialogo, setDialogo] = useState(null)
  const ultimaConsultaDetalle = useRef(0)

  // Los setState ocurren solo al llegar la respuesta (callbacks de la promesa).
  const cargarCursos = useCallback((preferido) => api.listarCursos().then(
    (datos) => {
      setCursos({ estado: 'listo', datos, error: null })
      setSeleccionado((actual) => elegirCurso(datos, preferido === undefined ? actual : preferido))
    },
    (e) => setCursos({ estado: 'error', datos: [], error: mensajeDeError(e) }),
  ), [])

  const cargarDetalle = useCallback((cursoId) => {
    const consulta = ++ultimaConsultaDetalle.current
    const vigente = () => consulta === ultimaConsultaDetalle.current
    return Promise.all([api.listarEvaluaciones(cursoId), api.obtenerResumen(cursoId)]).then(
      ([evaluaciones, resumen]) => {
        if (vigente()) setDetalle({ estado: 'listo', evaluaciones, resumen, error: null })
      },
      (e) => {
        if (vigente()) setDetalle({ estado: 'error', evaluaciones: [], resumen: null, error: mensajeDeError(e) })
      },
    )
  }, [])

  useEffect(() => {
    cargarCursos()
  }, [cargarCursos])

  useEffect(() => {
    if (seleccionado !== null) cargarDetalle(seleccionado)
  }, [seleccionado, cargarDetalle])

  function seleccionar(id) {
    if (id === seleccionado) return
    setDetalle({ estado: 'cargando', evaluaciones: [], resumen: null, error: null })
    setSeleccionado(id)
  }

  function reintentarCursos() {
    setCursos({ estado: 'cargando', datos: [], error: null })
    cargarCursos()
  }

  function reintentarDetalle() {
    setDetalle({ estado: 'cargando', evaluaciones: [], resumen: null, error: null })
    cargarDetalle(seleccionado)
  }

  const cerrar = () => setDialogo(null)
  const curso = cursos.datos.find((c) => c.id === seleccionado) ?? null
  // Nota sugerida por evaluación pendiente, tal como la entrega GET /resumen (no se recalcula).
  const sugeridas = new Map(
    (detalle.resumen?.evaluaciones_pendientes_detalle ?? []).map((p) => [p.id, p.nota_sugerida]),
  )

  // ── Acciones (cada una actualiza los datos afectados y el resumen) ──
  async function crearCurso(cuerpo) {
    const nuevo = await api.crearCurso(cuerpo)
    setDialogo(null)
    if (nuevo.id !== seleccionado) {
      setDetalle({ estado: 'cargando', evaluaciones: [], resumen: null, error: null })
    }
    await cargarCursos(nuevo.id)
  }

  async function editarCurso(cuerpo) {
    await api.editarCurso(curso.id, cuerpo)
    setDialogo(null)
    await Promise.all([cargarCursos(), cargarDetalle(curso.id)])
  }

  async function guardarObjetivo(notaObjetivo) {
    await api.editarCurso(curso.id, { nota_objetivo: notaObjetivo })
    await Promise.all([cargarCursos(), cargarDetalle(curso.id)])
  }

  async function eliminarCurso() {
    const eliminado = curso.id
    await api.eliminarCurso(eliminado)
    setDialogo(null)
    setDetalle({ estado: 'cargando', evaluaciones: [], resumen: null, error: null })
    // Si se eliminó el seleccionado, elegirCurso toma el primero de los restantes.
    await cargarCursos(eliminado)
  }

  async function crearEvaluacion(cuerpo) {
    await api.crearEvaluacion(curso.id, cuerpo)
    setDialogo(null)
    await cargarDetalle(curso.id)
  }

  async function editarEvaluacion(cuerpo) {
    await api.editarEvaluacion(dialogo.evaluacion.id, cuerpo)
    setDialogo(null)
    await cargarDetalle(curso.id)
  }

  async function eliminarEvaluacion() {
    await api.eliminarEvaluacion(dialogo.evaluacion.id)
    setDialogo(null)
    await cargarDetalle(curso.id)
  }

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1 className="pagina__titulo">Mis notas</h1>
          <p className="pagina__subtitulo">Organiza tus evaluaciones y calcula tu nota objetivo.</p>
        </div>
        <button type="button" className="boton boton--primario" onClick={() => setDialogo({ tipo: 'curso-nuevo' })}>
          <IconoMas /> Nuevo curso
        </button>
      </header>

      {cursos.estado === 'cargando' && <StatusMessage tipo="cargando">Cargando cursos…</StatusMessage>}
      {cursos.estado === 'error' && (
        <StatusMessage tipo="error" onReintentar={reintentarCursos}>{cursos.error}</StatusMessage>
      )}
      {cursos.estado === 'listo' && cursos.datos.length === 0 && (
        <StatusMessage tipo="vacio">Aún no tienes cursos. Crea el primero.</StatusMessage>
      )}

      {cursos.estado === 'listo' && curso && (
        <div className="notas">
          <nav className="panel cursos" aria-label="Cursos">
            <h2 className="panel__titulo">Cursos</h2>
            <ul className="cursos__lista">
              {cursos.datos.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="cursos__item"
                    aria-current={c.id === seleccionado ? 'true' : undefined}
                    onClick={() => seleccionar(c.id)}
                  >
                    {c.nombre}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <section className="panel detalle" aria-labelledby="titulo-curso">
            <header className="detalle__cabecera">
              <h2 id="titulo-curso" className="detalle__titulo">{curso.nombre}</h2>
              <div className="acciones">
                <button type="button" className="boton-icono" aria-label={`Editar curso ${curso.nombre}`}
                  title="Editar curso" onClick={() => setDialogo({ tipo: 'curso-editar' })}>
                  <IconoEditar />
                </button>
                <button type="button" className="boton-icono boton-icono--peligro" aria-label={`Eliminar curso ${curso.nombre}`}
                  title="Eliminar curso" onClick={() => setDialogo({ tipo: 'curso-eliminar' })}>
                  <IconoEliminar />
                </button>
              </div>
            </header>

            {detalle.estado === 'cargando' && <StatusMessage tipo="cargando">Cargando curso…</StatusMessage>}
            {detalle.estado === 'error' && (
              <StatusMessage tipo="error" onReintentar={reintentarDetalle}>{detalle.error}</StatusMessage>
            )}
            {detalle.estado === 'listo' && (
              <>
                <ResumenCurso resumen={detalle.resumen} onGuardarObjetivo={guardarObjetivo} />

                <div className="evaluaciones">
                  <div className="evaluaciones__cabecera">
                    <h3 className="evaluaciones__titulo">Evaluaciones</h3>
                    <p className="evaluaciones__total">Total registrado: {detalle.resumen.suma_pesos} %</p>
                    <button type="button" className="boton boton--primario" onClick={() => setDialogo({ tipo: 'eval-nueva' })}>
                      <IconoMas /> Evaluación
                    </button>
                  </div>

                  {detalle.evaluaciones.length === 0 ? (
                    <StatusMessage tipo="vacio">Este curso aún no tiene evaluaciones.</StatusMessage>
                  ) : (
                    <div className="tabla-scroll">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th scope="col">Evaluación</th>
                            <th scope="col">Peso</th>
                            <th scope="col">Nota</th>
                            <th scope="col"><span className="solo-lector">Acciones</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.evaluaciones.map((ev) => (
                            <tr key={ev.id}>
                              <td>{ev.nombre}</td>
                              <td>{ev.peso_porcentaje} %</td>
                              <td>
                                {ev.nota === null ? (
                                  <span className="etiquetas">
                                    <span className="etiqueta etiqueta--neutro">Pendiente</span>
                                    {sugeridas.get(ev.id) != null && (
                                      // Sugerencia de la API (no es una nota real ni se guarda).
                                      <span className="etiqueta etiqueta--sugerida">Sugerida: {sugeridas.get(ev.id)}</span>
                                    )}
                                  </span>
                                ) : ev.nota}
                              </td>
                              <td>
                                <div className="acciones">
                                  <button type="button" className="boton-icono" aria-label={`Editar ${ev.nombre}`} title="Editar"
                                    onClick={() => setDialogo({ tipo: 'eval-editar', evaluacion: ev })}>
                                    <IconoEditar />
                                  </button>
                                  <button type="button" className="boton-icono boton-icono--peligro" aria-label={`Eliminar ${ev.nombre}`}
                                    title="Eliminar" onClick={() => setDialogo({ tipo: 'eval-eliminar', evaluacion: ev })}>
                                    <IconoEliminar />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {dialogo?.tipo === 'curso-nuevo' && <CursoFormModal curso={null} onGuardar={crearCurso} onCerrar={cerrar} />}
      {dialogo?.tipo === 'curso-editar' && <CursoFormModal curso={curso} onGuardar={editarCurso} onCerrar={cerrar} />}
      {dialogo?.tipo === 'curso-eliminar' && (
        <ConfirmDialog titulo="Eliminar curso" mensaje={MENSAJE_ELIMINAR_CURSO} onConfirmar={eliminarCurso} onCancelar={cerrar} />
      )}
      {dialogo?.tipo === 'eval-nueva' && <EvaluacionFormModal evaluacion={null} onGuardar={crearEvaluacion} onCerrar={cerrar} />}
      {dialogo?.tipo === 'eval-editar' && (
        <EvaluacionFormModal evaluacion={dialogo.evaluacion} onGuardar={editarEvaluacion} onCerrar={cerrar} />
      )}
      {dialogo?.tipo === 'eval-eliminar' && (
        <ConfirmDialog titulo="Eliminar evaluación" mensaje={MENSAJE_ELIMINAR_EVALUACION} onConfirmar={eliminarEvaluacion} onCancelar={cerrar} />
      )}
    </div>
  )
}
