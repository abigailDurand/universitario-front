import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import StatusMessage from './components/StatusMessage.jsx'
import NotasPage from './pages/NotasPage.jsx'
import PendientesPage from './pages/PendientesPage.jsx'
import AccesoPage from './pages/AccesoPage.jsx'
import { mensajeDeError, registrarCierreDeSesion } from './api/http.js'
import { cerrarSesion, obtenerUsuario } from './api/auth.js'
import { leerSesion, sesionVencida, borrarSesion } from './api/sesion.js'

// Sin sesión muestra el acceso; con sesión alterna entre ambas pantallas sin librería
// de rutas y abre "Mis notas" por defecto. Cada sesión monta las pantallas desde cero
// (`key`), así otro usuario nunca ve datos del anterior.
function estadoInicial() {
  const sesion = leerSesion()
  if (sesion && !sesionVencida(sesion)) return { fase: 'verificando', usuario: null, aviso: null }
  if (sesion) borrarSesion()
  return {
    fase: 'anonimo',
    usuario: null,
    aviso: sesion ? 'La sesión venció. Inicia sesión de nuevo.' : null,
  }
}

export default function App() {
  const [estado, setEstado] = useState(estadoInicial)
  const [seccion, setSeccion] = useState('notas')
  const [numeroSesion, setNumeroSesion] = useState(0)

  const salir = useCallback((aviso = null) => {
    setEstado({ fase: 'anonimo', usuario: null, aviso })
    setSeccion('notas')
  }, [])

  // Cualquier 401 o sesión vencida en cualquier API vuelve al acceso con el mensaje.
  useEffect(() => registrarCierreDeSesion((mensaje) => salir(mensaje)), [salir])

  const verificar = useCallback(async () => {
    try {
      const usuario = await obtenerUsuario()
      setEstado({ fase: 'autenticado', usuario, aviso: null })
    } catch (e) {
      // Un 401 ya cerró la sesión (registrarCierreDeSesion); otro error permite reintentar.
      if (e?.status !== 401) setEstado((prev) => ({ ...prev, fase: 'error', aviso: mensajeDeError(e) }))
    }
  }, [])

  useEffect(() => {
    if (estado.fase === 'verificando') verificar()
  }, [estado.fase, verificar])

  function alIniciarSesion(usuario) {
    setNumeroSesion((n) => n + 1)
    setSeccion('notas')
    setEstado({ fase: 'autenticado', usuario, aviso: null })
  }

  function alCerrarSesion() {
    cerrarSesion()
    salir(null)
  }

  if (estado.fase === 'verificando') {
    return <main className="acceso"><StatusMessage tipo="cargando">Verificando la sesión…</StatusMessage></main>
  }
  if (estado.fase === 'error') {
    return (
      <main className="acceso">
        <StatusMessage tipo="error" onReintentar={() => setEstado((p) => ({ ...p, fase: 'verificando' }))}>
          {estado.aviso}
        </StatusMessage>
      </main>
    )
  }
  if (estado.fase === 'anonimo') {
    return <AccesoPage aviso={estado.aviso} onSesionIniciada={alIniciarSesion} />
  }

  return (
    <div className="app" key={numeroSesion}>
      <Sidebar activa={seccion} onCambiar={setSeccion} usuario={estado.usuario} onCerrarSesion={alCerrarSesion} />
      <main className="contenido">
        {seccion === 'notas' ? <NotasPage /> : <PendientesPage />}
      </main>
    </div>
  )
}
