// Tokens y sesiones de prueba. El front no valida firmas, así que basta un JWT con `exp`.
// Solo se usa en test/.
const b64url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function tokenDePrueba({ sub = '1', expSegundos = 3600 } = {}) {
  const exp = Math.floor(Date.now() / 1000) + expSegundos
  return `${b64url({ alg: 'EdDSA', typ: 'JWT', kid: 'prueba' })}.${b64url({ sub, exp })}.firma`
}

export function guardarSesionDePrueba(opciones) {
  const token = tokenDePrueba(opciones)
  const exp = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp
  sessionStorage.setItem('unipanel.sesion', JSON.stringify({ token, expira: exp * 1000 }))
  return token
}

export const USUARIO_A = { id: 1, nombre: 'Ana Pérez', email: 'ana@ejemplo.com' }
export const USUARIO_B = { id: 2, nombre: 'Beto Ruiz', email: 'beto@ejemplo.com' }
