# Arquitectura — `uni-panel`

```
Navegador ──► uni-panel (Nginx sin root, :8080)
               ├── /                     → React compilado (SPA, fallback a index.html)
               ├── /api/auth[/...]       → uni-notas-api:5000      (ruta completa; registro, login, me)
               ├── /api/notas[/...]      → uni-notas-api:5000      (ruta completa)
               ├── /api/pendientes[/...] → uni-pendientes-api:3000 (ruta completa)
               └── /api/* (otras)        → 404
uni-notas-api      ──► BD de notas (PostgreSQL)
uni-pendientes-api ──► BD de pendientes (PostgreSQL)
```

- El navegador **solo** habla con Nginx (mismo origen). Nunca llama directo a las API.
- Nginx reenvía la ruta **completa**, sin quitar el prefijo (`proxy_pass` sin URI final).
- Los `/health` de las API **no** se publican (en Nginx, `/health` cae en la SPA).
- Las API no se llaman entre sí y cada una es la única que accede a su BD.
- **Autenticación** (`notas-service/AUTH.md`): `uni-notas-api` gestiona usuarios y firma JWT
  EdDSA de 8 h con su **clave privada**; ambas API los validan con la **clave pública** y filtran
  todo por el `usuario_id` del token. El navegador guarda el token en `sessionStorage` y lo envía
  como `Authorization: Bearer`. `cursos.usuario_id` y `pendientes.usuario_id` no se relacionan
  entre bases de datos.

### Claves del token por entorno

| Entorno | Clave privada (solo notas) | Clave pública (ambas API) |
|---|---|---|
| Docker Compose | Archivo `secretos/jwt-privada.pem` (ignorado por git) | `secretos/jwt-publica.pem` |
| K3s | Secret `jwt-privada` (clave `privada.pem`), solo en `uni-notas-api`, en `/secretos/jwt/privada/` | Secret `jwt-publica` (clave `publica.pem`), en ambas API, en `/secretos/jwt/publica/` |

`JWT_KID`: `.env` en Compose; `unipanel-1` en los manifiestos. Las API usan `strategy: Recreate`
en K3s porque migran el esquema al arrancar.

Se generan una vez (`openssl genpkey -algorithm ed25519`) y nunca se guardan en el repo.

## Entornos

| Entorno | Quién reenvía `/api/...` | Destinos |
|---|---|---|
| `npm run dev` | Proxy de Vite (`vite.config.js`) | `NOTAS_API_URL` (por defecto `http://127.0.0.1:5000`) y `PENDIENTES_API_URL` (por defecto `http://127.0.0.1:3000`) |
| Contenedor / Compose / Kubernetes | Nginx (`nginx/default.conf`) | `uni-notas-api:5000` y `uni-pendientes-api:3000` (nombres DNS) |

Nginx resuelve los nombres al arrancar: si alguno no existe en la red, no inicia.

## Integración local (`docker-compose.yml`)

| Servicio | Imagen | Publicado |
|---|---|---|
| `uni-panel` | `build: .` | `127.0.0.1:8080` (o `UNI_PANEL_PORT`) |
| `uni-notas-api` | `build: ../notas-service` | no |
| `uni-pendientes-api` | `build: ../pendientes-service` | no |
| `uni-notas-db`, `uni-pendientes-db` | `postgres:17-alpine`, volúmenes `notas-datos` / `pendientes-datos` | no |

Arranque en orden por `healthcheck`: BD (`pg_isready`) → API (`GET /health` dentro del
contenedor) → `uni-panel`. Contraseñas en `.env` (ignorado); plantilla `.env.example`.
Las API crean sus tablas al arrancar.

## Código

| Archivo | Papel |
|---|---|
| `src/App.jsx` | Alterna *Mis notas* / *Mis pendientes* (sin librería de rutas) |
| `src/api/http.js` | `fetch` común; `{ "error" }` → `ApiError`; 204 sin JSON; texto genérico |
| `src/api/notas.js`, `src/api/pendientes.js` | Endpoints de cada contrato |
| `src/utils/numeros.js` | Lectura de notas/pesos (rango, 2 decimales, vacío → null) |
| `src/utils/fechas.js` | Hora de Perú: formato, `datetime-local` ↔ ISO `-05:00` |
| `src/components/` | `Sidebar`, `Modal`, `ConfirmDialog`, `StatusMessage`, `Campo`, `Iconos`, formularios por pantalla |
| `src/pages/` | `NotasPage.jsx`, `PendientesPage.jsx` |
| `test/` | Vitest + Testing Library (jsdom) con `fetch` simulado |
| `nginx/` | `default.conf` (SPA + proxies) y `proxy-comun.inc` (cabeceras) |
| `Dockerfile` | Build con Node 24 → `nginxinc/nginx-unprivileged:1.27-alpine` (uid 101, :8080) |
| `.github/workflows/` | `ci-publicar.yml` (pruebas + imagen en GHCR) y `servicio-actualizado.yml` (recibe el aviso de las API) |
| `k8s/` | Manifiestos de K3s (Kustomize): 2 PostgreSQL con PVC, 2 API, panel e Ingress de Traefik; guía en `k8s/README.md` |
