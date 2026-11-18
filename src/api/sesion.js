// Sesión del navegador (notas-service/AUTH.md §7).
// sessionStorage `unipanel.sesion` = { token, expira } (expira = exp del token en ms).
// El front no valida la firma: solo lee `exp` para no usar un token vencido.
// El token nunca se muestra ni se escribe en la consola.

const CLAVE = 'unipanel.sesion'

function almacen() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

// `exp` (segundos) del payload de un JWT, o null si no se puede leer.
export function expiracionDeToken(token) {
  try {
    const partes = String(token).split('.')
    if (partes.length !== 3) return null
    let base = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base.length % 4) base += '='
    const exp = JSON.parse(atob(base)).exp
    return Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

export function guardarSesion(token) {
  const exp = expiracionDeToken(token)
  if (exp === null) throw new Error('Token sin expiración')
  const sesion = { token, expira: exp * 1000 }
  try {
    almacen()?.setItem(CLAVE, JSON.stringify(sesion))
  } catch {
    // Sin almacenamiento disponible: la sesión dura solo mientras la página siga abierta.
  }
  memoria = sesion
  return sesion
}

let memoria = null

export function leerSesion() {
  if (memoria) return memoria
  try {
    const crudo = almacen()?.getItem(CLAVE)
    if (!crudo) return null
    const sesion = JSON.parse(crudo)
    if (typeof sesion?.token !== 'string' || !Number.isFinite(sesion?.expira)) return null
    memoria = sesion
    return sesion
  } catch {
    return null
  }
}

export function borrarSesion() {
  memoria = null
  try {
    almacen()?.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
}

export const sesionVencida = (sesion, ahora = Date.now()) => !sesion || sesion.expira <= ahora
