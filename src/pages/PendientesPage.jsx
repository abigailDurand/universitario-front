// Pantalla "Mis pendientes": filtros, tabla y formulario en modal.
// Consume uni-pendientes-api (src/api/pendientes.js). Orden y `vencido` vienen de la API.
import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/pendientes.js'
import { mensajeDeError } from '../api/http.js'
import StatusMessage from '../components/StatusMessage.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PendienteFormModal from '../components/pendientes/PendienteFormModal.jsx'
import { IconoEditar, IconoEliminar, IconoMas } from '../components/Iconos.jsx'
import { formatearFechaPeru } from '../utils/fechas.js'

const MENSAJE_ELIMINAR = '¿Eliminar este pendiente? Esta acción no se puede deshacer.'
const ETIQUETA_TIPO = { tarea: 'Tarea', examen: 'Examen' }
const ETIQUETA_ESTADO = { pendiente: 'Pendiente', completado: 'Completado' }

export default function PendientesPage() {
  const [filtros, setFiltros] = useState({ estado: '', tipo: '' })
  const [lista, setLista] = useState({ estado: 'cargando', datos: [], error: null })
  const [guardandoId, setGuardandoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)
  const [dialogo, setDialogo] = useState(null)
  const ultimaConsulta = useRef(0)
  const filtrosRef = useRef(filtros)

  // Solo se aplica la respuesta de la última consulta (filtros cambiados rápido).
  const cargar = useCallback((filtrosActivos) => {
    const consulta = ++ultimaConsulta.current
    const vigente = () => consulta === ultimaConsulta.current
    return api.listarPendientes(filtrosActivos).then(
      (datos) => { if (vigente()) setLista({ estado: 'listo', datos, error: null }) },
      (e) => { if (vigente()) setLista({ estado: 'error', datos: [], error: mensajeDeError(e) }) },
    )
  }, [])

  useEffect(() => {
    filtrosRef.current = filtros
    cargar(filtros)
  }, [filtros, cargar])

  const recargar = () => cargar(filtrosRef.current)

  function cambiarFiltro(campo) {
    return (evento) => {
      setLista((l) => ({ ...l, estado: 'cargando' }))
      setFiltros((f) => ({ ...f, [campo]: evento.target.value }))
    }
  }

  function reintentar() {
    setLista({ estado: 'cargando', datos: [], error: null })
    recargar()
  }

  async function alternarEstado(pendiente) {
    if (guardandoId !== null) return
    setGuardandoId(pendiente.id)
    setErrorAccion(null)
    const nuevo = pendiente.estado === 'completado' ? 'pendiente' : 'completado'
    try {
      await api.cambiarEstado(pendiente.id, nuevo)
    } catch (e) {
      setErrorAccion(mensajeDeError(e))
    } finally {
      await recargar()
      setGuardandoId(null)
    }
  }

  async function crear(cuerpo) {
    await api.crearPendiente(cuerpo)
    setDialogo(null)
    await recargar()
  }

  async function editar(cuerpo) {
    await api.editarPendiente(dialogo.pendiente.id, cuerpo)
    setDialogo(null)
    await recargar()
  }

  async function eliminar() {
    await api.eliminarPendiente(dialogo.pendiente.id)
    setDialogo(null)
    await recargar()
  }

  const hayFiltros = filtros.estado !== '' || filtros.tipo !== ''

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1 className="pagina__titulo">Mis pendientes</h1>
          <p className="pagina__subtitulo">Tus tareas y exámenes, en un solo lugar.</p>
        </div>
        <button type="button" className="boton boton--primario" onClick={() => setDialogo({ tipo: 'nuevo' })}>
          <IconoMas /> Nuevo pendiente
        </button>
      </header>

      <div className="panel">
        <div className="filtros" role="group" aria-label="Filtros">
          <label className="filtro">
            <span className="campo__etiqueta">Estado</span>
            <select value={filtros.estado} onChange={cambiarFiltro('estado')}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
            </select>
          </label>
          <label className="filtro">
            <span className="campo__etiqueta">Tipo</span>
            <select value={filtros.tipo} onChange={cambiarFiltro('tipo')}>
              <option value="">Todos</option>
              <option value="tarea">Tarea</option>
              <option value="examen">Examen</option>
            </select>
          </label>
          <p className="filtros__nota">Fechas en hora de Perú.</p>
        </div>

        {errorAccion && <p className="alerta alerta--error" role="alert">{errorAccion}</p>}

        {lista.estado === 'cargando' && <StatusMessage tipo="cargando">Cargando pendientes…</StatusMessage>}
        {lista.estado === 'error' && <StatusMessage tipo="error" onReintentar={reintentar}>{lista.error}</StatusMessage>}
        {lista.estado === 'listo' && lista.datos.length === 0 && (
          <StatusMessage tipo="vacio">
            {hayFiltros ? 'No hay pendientes con estos filtros.' : 'Aún no tienes pendientes.'}
          </StatusMessage>
        )}

        {lista.estado === 'listo' && lista.datos.length > 0 && (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col"><span className="solo-lector">Completado</span></th>
                  <th scope="col">Pendiente</th>
                  <th scope="col">Curso</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Fecha límite</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="solo-lector">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {lista.datos.map((p) => {
                  const completado = p.estado === 'completado'
                  return (
                    <tr key={p.id} className={completado ? 'fila--completada' : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          className="casilla"
                          checked={completado}
                          disabled={guardandoId !== null}
                          aria-label={completado ? `Reabrir ${p.titulo}` : `Marcar como completado ${p.titulo}`}
                          onChange={() => alternarEstado(p)}
                        />
                      </td>
                      <td>
                        <span className="celda-titulo">{p.titulo}</span>
                        {p.descripcion && <span className="celda-descripcion">{p.descripcion}</span>}
                      </td>
                      <td>{p.curso_nombre}</td>
                      <td><span className={`etiqueta etiqueta--${p.tipo}`}>{ETIQUETA_TIPO[p.tipo] ?? p.tipo}</span></td>
                      <td className="celda-fecha">{formatearFechaPeru(p.fecha_limite)}</td>
                      <td>
                        <span className="etiquetas">
                          <span className={`etiqueta etiqueta--${p.estado}`}>{ETIQUETA_ESTADO[p.estado] ?? p.estado}</span>
                          {p.vencido && <span className="etiqueta etiqueta--vencido">Vencido</span>}
                        </span>
                      </td>
                      <td>
                        <div className="acciones">
                          <button type="button" className="boton-icono" aria-label={`Editar ${p.titulo}`} title="Editar"
                            onClick={() => setDialogo({ tipo: 'editar', pendiente: p })}>
                            <IconoEditar />
                          </button>
                          <button type="button" className="boton-icono boton-icono--peligro" aria-label={`Eliminar ${p.titulo}`}
                            title="Eliminar" onClick={() => setDialogo({ tipo: 'eliminar', pendiente: p })}>
                            <IconoEliminar />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogo?.tipo === 'nuevo' && <PendienteFormModal pendiente={null} onGuardar={crear} onCerrar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'editar' && (
        <PendienteFormModal pendiente={dialogo.pendiente} onGuardar={editar} onCerrar={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === 'eliminar' && (
        <ConfirmDialog titulo="Eliminar pendiente" mensaje={MENSAJE_ELIMINAR} onConfirmar={eliminar} onCancelar={() => setDialogo(null)} />
      )}
    </div>
  )
}
