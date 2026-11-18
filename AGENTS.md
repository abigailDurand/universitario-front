# AGENTS.md — universitario-front (`uni-panel`, aplicación UniPanel)

## Alcance

- **Contiene:** React (Vite, JavaScript, CSS), Nginx, Dockerfile, proxy de desarrollo,
  `docker-compose.yml` de integración local y carpeta `k8s/`.
- **Dominio:** Pantallas *Mis notas* y *Mis pendientes*, integración local y despliegue completo.
- **Especificación:** `docs/spec.md` y `docs/architecture.md`.
- **Contratos de las API:** `../notas-service/SPEC.md` y `../pendientes-service/SPEC.md`.
  No inventes campos ni respuestas; si algo no está en el contrato, pregunta.
- Fuera de alcance: el código de los demás repositorios, lógica de cálculo de notas y
  acceso directo a BD.

## Antes de empezar

1. Ejecuta `./init.sh`. Si falla, para y resuelve el entorno.
2. Lee `progress/current.md` para ver qué se hizo y qué sigue.
3. Elige **una** tarea sin marcar de `TASKS.md`.

## Estructura

```
src/
  api/http.js           fetch común; errores { "error" } → ApiError; 204 sin JSON
  api/notas.js          Endpoints de uni-notas-api (/api/notas)
  api/pendientes.js     Endpoints de uni-pendientes-api (/api/pendientes)
  utils/numeros.js      Lectura de notas, nota objetivo y peso
  utils/fechas.js       Hora de Perú (formato y datetime-local ↔ ISO -05:00)
  components/           Sidebar, Modal, ConfirmDialog, StatusMessage, Campo, Iconos
  components/notas/     CursoFormModal, EvaluacionFormModal, ResumenCurso
  components/pendientes PendienteFormModal
  pages/                NotasPage.jsx, PendientesPage.jsx
  App.jsx               Alterna pantallas (sin librería de rutas)
  main.jsx, index.css   Arranque y estilos (paleta en :root)
test/                   Vitest + Testing Library (fetch simulado solo en pruebas)
nginx/                  default.conf (SPA + proxies, :8080) y proxy-comun.inc
docker-compose.yml      Integración local de los 3 servicios y sus BD
docs/                   spec.md, architecture.md
k8s/                    Manifiestos de K3s con Kustomize (guía de despliegue: k8s/README.md)
.github/workflows/      ci-publicar.yml (pruebas + GHCR), servicio-actualizado.yml (aviso de las API)
Dockerfile              Build Node 24 → nginx-unprivileged:1.27-alpine, puerto 8080
```

## Comandos

| Acción | Comando |
|---|---|
| Verificar (lint + pruebas + build) | `./init.sh` |
| Instalar dependencias | `npm ci` |
| Desarrollo | `npm run dev` (APIs en 127.0.0.1:5000 y :3000, o `NOTAS_API_URL` / `PENDIENTES_API_URL`) |
| Lint | `npm run lint` |
| Pruebas | `npm test` |
| Build | `npm run build` |
| Imagen Docker | `docker build -t uni-panel:local .` |
| Integración local | `docker compose up -d --build` → http://127.0.0.1:8080 · `docker compose down` (`-v` borra datos) |

### Variables y credenciales (solo ubicación, nunca valores)

- `.env` (ignorado por git; plantilla `.env.example`): `NOTAS_DB_PASSWORD`,
  `PENDIENTES_DB_PASSWORD` y opcional `UNI_PANEL_PORT`. Los usa `docker-compose.yml`.
- `NOTAS_API_URL`, `PENDIENTES_API_URL`: destinos del proxy de Vite (opcionales).

## CI/CD (`.github/workflows/`)

- `ci-publicar.yml`: en pull request hacia `main` ejecuta `./init.sh`; en push a `main`, si pasa,
  publica `ghcr.io/abigaildurand/uni-panel:sha-<12 primeros del SHA>` con el `GITHUB_TOKEN`.
- `servicio-actualizado.yml`: recibe el `repository_dispatch` (`servicio-actualizado`) que envían
  `uni-notas-api` y `uni-pendientes-api` tras publicar su imagen. Valida `servicio`, `imagen`,
  `tag` y `commit` y los muestra en el resumen de la ejecución (pestaña *Actions*).
- El despliegue automático a K3s se conectará después del despliegue manual (`k8s/README.md`).
- El aviso lo envía cada API con su secret `PANEL_DISPATCH_TOKEN` (configurado en el repo de
  cada API, no aquí).

## Reglas esenciales

- Un solo agente implementa y verifica.
- Una tarea a la vez.
- Al terminar un cambio coherente, ejecuta `./init.sh`. No marques una tarea
  como hecha en `TASKS.md` si `init.sh` no termina en verde.
- Al cerrar, actualiza `progress/current.md`: lo realizado y lo siguiente.
  El historial detallado queda en Git.
- No dejes archivos temporales ni código de depuración.
- **Credenciales:** si creas alguna, informa al usuario el valor y dónde quedó; en el repo
  solo se documenta la ubicación y el nombre de la variable.
- Clúster confirmado: K3s de un nodo en EC2 (demo académica), Ingress de Traefik en el puerto 80,
  sin balanceador de AWS. Registro: GHCR. Nunca guardes Secrets en `k8s/` (se crean a mano).
- Si algo no está definido, pregunta en vez de suponer.
