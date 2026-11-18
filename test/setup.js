import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { borrarSesion } from '../src/api/sesion.js'

afterEach(() => {
  cleanup()
  borrarSesion()
  sessionStorage.clear()
})
