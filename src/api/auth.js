// Autenticación en uni-notas-api. Contrato: notas-service/AUTH.md y SPEC.md §8.
// Usuario: { id, nombre, email }
import { solicitar } from './http.js'
import { borrarSesion, guardarSesion } from './sesion.js'

const BASE = '/api/auth'

// datos: { nombre, email, password } → 201 usuario (sin token)
export const registrar = (datos) =>
  solicitar(`${BASE}/registro`, { method: 'POST', body: datos, autenticada: false })

// { email, password } → guarda la sesión y devuelve el usuario.
export async function iniciarSesion(credenciales) {
  const respuesta = await solicitar(`${BASE}/login`, { method: 'POST', body: credenciales, autenticada: false })
  guardarSesion(respuesta.token)
  return respuesta.usuario
}

export const obtenerUsuario = () => solicitar(`${BASE}/me`)

// Sin revocación en el servidor: cerrar sesión es descartar el token.
export const cerrarSesion = () => borrarSesion()
