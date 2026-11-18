import { useEffect, useId, useRef } from 'react'

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Modal centrado: título enlazado, foco atrapado, Escape para cerrar y
// devolución del foco al elemento que lo abrió.
export default function Modal({ titulo, onCerrar, bloqueado = false, children, rol = 'dialog' }) {
  const idTitulo = useId()
  const caja = useRef(null)
  const onCerrarRef = useRef(onCerrar)
  const bloqueadoRef = useRef(bloqueado)

  useEffect(() => {
    onCerrarRef.current = onCerrar
    bloqueadoRef.current = bloqueado
  })

  useEffect(() => {
    const anterior = document.activeElement
    const primero = caja.current.querySelector('[data-autofocus]') ??
      caja.current.querySelector(ENFOCABLES)
    ;(primero ?? caja.current).focus()

    return () => {
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) {
        anterior.focus()
      }
    }
  }, [])

  function alPulsarTecla(evento) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      if (!bloqueadoRef.current) onCerrarRef.current()
      return
    }
    if (evento.key !== 'Tab') return
    const elementos = [...caja.current.querySelectorAll(ENFOCABLES)]
    if (elementos.length === 0) {
      evento.preventDefault()
      return
    }
    const primero = elementos[0]
    const ultimo = elementos[elementos.length - 1]
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primero.focus()
    }
  }

  return (
    <div className="modal-fondo">
      <div
        ref={caja}
        className="modal"
        role={rol}
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={alPulsarTecla}
      >
        <h2 id={idTitulo} className="modal__titulo">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}
