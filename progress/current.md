# Estado actual

## Realizado

- Tareas 1–8 y 11 de `TASKS.md`. `./init.sh` en verde (eslint + 35 pruebas Vitest + vite build).
- Pantallas *Mis notas* y *Mis pendientes* completas según `docs/spec.md`; navegación sin
  librería de rutas (se quitó react-router).
- Imagen con `nginxinc/nginx-unprivileged:1.27-alpine` (uid 101, :8080): `nginx -t` y ruteo
  probados con servicios eco (ruta completa, otras `/api/*` → 404, `/health` → SPA).
- `docker-compose.yml` probado punta a punta por http://127.0.0.1:8080: curso, 3 evaluaciones,
  resumen (7.2 / 9.5 / `alcanzable`), `PATCH {}` → 400, pendiente con fecha `Z` → `-05:00`,
  `PATCH estado`, filtros combinados, filtro inválido → 400, DELETE 204. Datos de prueba
  borrados y `docker compose down -v --rmi local` (sin volúmenes ni imágenes locales).
- `.env` local creado con contraseñas aleatorias (ignorado por git). Subido a `github.com/abigailDurand/universitario-front` (privado); `.gitattributes` fija LF.

- CI/CD: `ci-publicar.yml` (pruebas en PR; en push a `main` publica
  `ghcr.io/abigaildurand/uni-panel:sha-<commit>`) y `servicio-actualizado.yml` (valida el aviso de
  las API y lo muestra en el resumen de la ejecución). Sin despliegue todavía.

## Decisiones a confirmar

- Textos del front no fijados por la SPEC:
  - Etiquetas del estado del objetivo: *Objetivo alcanzado*, *Objetivo alcanzable*,
    *Objetivo no alcanzado*, *Objetivo no alcanzable*, *Sin cálculo todavía*; título
    *Aprobación del curso* sobre `mensaje_aprobacion`.
  - Confirmación de evaluación: *“¿Eliminar esta evaluación? Esta acción no se puede deshacer.”*
  - Validación en el cliente: textos de la SPEC de cada API, salvo *“Admite como máximo 2
    decimales.”*, *“La nota debe ser un número entre 0 y 20, o quedar vacía si está
    pendiente.”*, *“La descripción debe tener máximo 1000 caracteres.”* y *“La fecha y
    hora límite son obligatorias.”*
  - Botón *Guardar objetivo* para la nota objetivo editable del resumen; *Eliminando…* en
    la confirmación.
- Entrada decimal con punto o coma (`14,5` → 14.5).
- Azul pastel de examen `#DCEBFA` (la paleta no lo define). `#8055C4` con blanco ≈ 5.1:1 (cumple AA).
- Crear curso selecciona el curso nuevo. Editar curso sin cambios cierra sin PATCH (como en pendientes).
- Compose: `postgres:17-alpine`, usuarios/BD `notas` y `pendientes`; healthchecks de las API
  contra `/health` dentro de cada contenedor; puerto local configurable con `UNI_PANEL_PORT`.
- `npm audit`: avisos en dependencias de desarrollo de Vite; no llegan a la imagen.

## Siguiente

- Confirmar el clúster para `k8s/` y el paso de despliegue (tareas 9–10). La imagen en GHCR es
  privada: el clúster necesitará credenciales para descargarla.
- Revisar el diseño cuando se compartan las imágenes de referencia.
