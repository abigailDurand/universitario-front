import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Solo en desarrollo (`npm run dev`): el proxy de Vite cumple el papel de Nginx.
// Reenvía la ruta completa, sin quitar el prefijo (igual que nginx/default.conf).
// Destinos por defecto: puertos locales de cada API (notas 5000, pendientes 3000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/auth': env.NOTAS_API_URL || 'http://127.0.0.1:5000',
        '/api/notas': env.NOTAS_API_URL || 'http://127.0.0.1:5000',
        '/api/pendientes': env.PENDIENTES_API_URL || 'http://127.0.0.1:3000',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.js'],
      include: ['test/**/*.test.{js,jsx}'],
      restoreMocks: true,
    },
  }
})
