// Iconos sencillos (decorativos: el botón que los contiene lleva aria-label).
function Icono({ children }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const IconoEditar = () => (
  <Icono><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icono>
)

export const IconoEliminar = () => (
  <Icono><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></Icono>
)

export const IconoMas = () => (
  <Icono><path d="M12 5v14" /><path d="M5 12h14" /></Icono>
)

export const IconoCompletar = () => (
  <Icono><path d="M20 6 9 17l-5-5" /></Icono>
)
