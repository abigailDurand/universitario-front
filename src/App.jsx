import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import NotasPage from './pages/NotasPage.jsx'
import PendientesPage from './pages/PendientesPage.jsx'

// Alterna entre ambas pantallas sin librería de rutas. Abre "Mis notas" por defecto.
export default function App() {
  const [seccion, setSeccion] = useState('notas')

  return (
    <div className="app">
      <Sidebar activa={seccion} onCambiar={setSeccion} />
      <main className="contenido">
        {seccion === 'notas' ? <NotasPage /> : <PendientesPage />}
      </main>
    </div>
  )
}
