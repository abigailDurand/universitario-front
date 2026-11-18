const SECCIONES = [
  { id: 'notas', etiqueta: 'Mis notas' },
  { id: 'pendientes', etiqueta: 'Mis pendientes' },
]

export default function Sidebar({ activa, onCambiar, usuario, onCerrarSesion }) {
  return (
    <aside className="sidebar">
      <p className="sidebar__marca">UniPanel</p>
      <nav aria-label="Secciones">
        <ul className="sidebar__lista">
          {SECCIONES.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="sidebar__enlace"
                aria-current={activa === s.id ? 'page' : undefined}
                onClick={() => onCambiar(s.id)}
              >
                {s.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {usuario && (
        <div className="sidebar__usuario">
          <p className="sidebar__nombre" title={usuario.email}>{usuario.nombre}</p>
          <button type="button" className="boton boton--secundario sidebar__salir" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
