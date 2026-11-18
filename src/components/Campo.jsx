import { useId } from 'react'

// Campo de formulario con etiqueta, ayuda y error enlazados (accesible).
// `children` recibe las props de accesibilidad para el control.
export default function Campo({ etiqueta, error, ayuda, children }) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined

  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>{etiqueta}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {ayuda && <p className="campo__ayuda" id={idAyuda}>{ayuda}</p>}
      {error && <p className="campo__error" id={idError}>{error}</p>}
    </div>
  )
}
