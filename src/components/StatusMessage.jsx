// Estados de carga, vacío y error de una sección.
// tipo: 'cargando' | 'vacio' | 'error'
export default function StatusMessage({ tipo, children, onReintentar }) {
  if (tipo === 'cargando') {
    return (
      <p className="estado estado--cargando" role="status">
        <span className="girador" aria-hidden="true" /> {children ?? 'Cargando…'}
      </p>
    )
  }
  if (tipo === 'error') {
    return (
      <div className="estado estado--error" role="alert">
        <p><strong>Error:</strong> {children}</p>
        {onReintentar && (
          <button type="button" className="boton boton--secundario" onClick={onReintentar}>
            Reintentar
          </button>
        )}
      </div>
    )
  }
  return <p className="estado estado--vacio">{children}</p>
}
