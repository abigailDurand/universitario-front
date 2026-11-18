// Pantallas "Iniciar sesión" y "Crear cuenta" (docs/spec.md §9).
// Los textos de error vienen de la API (notas-service/SPEC.md §8).
import { useState } from 'react'
import Campo from '../components/Campo.jsx'
import { mensajeDeError } from '../api/http.js'
import { iniciarSesion, registrar } from '../api/auth.js'

const MENSAJES = {
  nombre: 'El nombre debe tener entre 1 y 100 caracteres.',
  email: 'Ingresa un email válido.',
  password: 'La contraseña debe tener entre 8 y 128 caracteres.',
  passwordLogin: 'Ingresa tu contraseña.',
}

const largo = (texto) => [...texto].length

function validar(modo, valores) {
  const nombre = largo(valores.nombre.trim())
  const email = valores.email.trim()
  const password = largo(valores.password)
  const errores = {
    email: email === '' || !email.includes('@') ? MENSAJES.email : null,
  }
  if (modo === 'registro') {
    errores.nombre = nombre < 1 || nombre > 100 ? MENSAJES.nombre : null
    errores.password = password < 8 || password > 128 ? MENSAJES.password : null
  } else {
    errores.password = password === 0 ? MENSAJES.passwordLogin : null
  }
  return errores
}

export default function AccesoPage({ aviso, onSesionIniciada }) {
  const [modo, setModo] = useState('login')
  const [valores, setValores] = useState({ nombre: '', email: '', password: '' })
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const registro = modo === 'registro'

  const cambiar = (campo) => (evento) => setValores((v) => ({ ...v, [campo]: evento.target.value }))

  function cambiarModo(nuevo) {
    setModo(nuevo)
    setErrores({})
    setErrorEnvio(null)
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando) return
    const nuevos = validar(modo, valores)
    setErrores(nuevos)
    if (Object.values(nuevos).some(Boolean)) return

    const email = valores.email.trim()
    setEnviando(true)
    setErrorEnvio(null)
    try {
      if (registro) {
        await registrar({ nombre: valores.nombre.trim(), email, password: valores.password })
      }
      const usuario = await iniciarSesion({ email, password: valores.password })
      onSesionIniciada(usuario)
    } catch (e) {
      setErrorEnvio(mensajeDeError(e))
      setEnviando(false)
    }
  }

  const titulo = registro ? 'Crear cuenta' : 'Iniciar sesión'

  return (
    <main className="acceso">
      <div className="acceso__tarjeta">
        <p className="acceso__marca">UniPanel</p>
        <h1 className="acceso__titulo">{titulo}</h1>
        {aviso && !errorEnvio && <p className="alerta alerta--aviso" role="status">{aviso}</p>}

        <form onSubmit={enviar} noValidate aria-label={titulo}>
          {registro && (
            <Campo etiqueta="Nombre" error={errores.nombre}>
              {(props) => (
                <input {...props} type="text" value={valores.nombre} onChange={cambiar('nombre')}
                  autoComplete="name" required />
              )}
            </Campo>
          )}
          <Campo etiqueta="Email" error={errores.email}>
            {(props) => (
              <input {...props} type="email" value={valores.email} onChange={cambiar('email')}
                autoComplete="email" required />
            )}
          </Campo>
          <Campo etiqueta="Contraseña" error={errores.password} ayuda={registro ? 'Entre 8 y 128 caracteres.' : undefined}>
            {(props) => (
              <input {...props} type="password" value={valores.password} onChange={cambiar('password')}
                autoComplete={registro ? 'new-password' : 'current-password'} required />
            )}
          </Campo>

          {errorEnvio && <p className="alerta alerta--error" role="alert">{errorEnvio}</p>}

          <button type="submit" className="boton boton--primario acceso__enviar" disabled={enviando}>
            {enviando ? (registro ? 'Guardando…' : 'Entrando…') : (registro ? 'Crear cuenta' : 'Entrar')}
          </button>
        </form>

        <p className="acceso__cambio">
          {registro ? (
            <button type="button" className="enlace" onClick={() => cambiarModo('login')} disabled={enviando}>
              Ya tengo una cuenta
            </button>
          ) : (
            <button type="button" className="enlace" onClick={() => cambiarModo('registro')} disabled={enviando}>
              Crear una cuenta
            </button>
          )}
        </p>
      </div>
    </main>
  )
}
