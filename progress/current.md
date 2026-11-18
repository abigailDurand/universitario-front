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

- Tarea 9: manifiestos de K3s en `k8s/` (Kustomize, namespace `unipanel`). Probados en K3s
  v1.32.2 en un contenedor `rancher/k3s` con las imágenes locales: pods `Running`, PVC `Bound`,
  acceso por el puerto 80 de Traefik, resumen 7.2 / 9.5, y datos conservados tras reiniciar
  ambas BD. Clúster de prueba eliminado.

- Tarea 12: desplegado en EC2 (t3.small, Ubuntu 26.04, K3s v1.37.2), probado por la IP pública.
  - t3.micro no alcanzaba (1 GB): se cambió a t3.small y se añadió swap de 2 GB.
  - AppArmor `cri-containerd.apparmor.d` bloquea señales entre procesos del contenedor:
    pods con `appArmorProfile: Unconfined`; PostgreSQL como uid 70 (sin gosu); `startupProbe`
    de 3 min en las BD. Volúmenes de las BD reiniciados dos veces (sin datos de usuario).
  - Secrets en el clúster: `notas-db`, `pendientes-db` (generados en la EC2) y
    `ghcr-credenciales` (creado por el usuario).

- Tarea 10: CD automático verificado (18-11-2026) en los tres repos (rama principal `main`):
  - front `c83e096`… → `uni-panel:sha-ec76a481e8fc`; notas `e356690` → `uni-notas-api:sha-e356690b4fbe`;
    pendientes `babd58a` → `uni-pendientes-api:sha-babd58abd559`. Cada despliegue cambió solo su
    servicio, abrió y cerró su regla 22/tcp /32, y los PVC conservaron el UID; los registros
    marcador sobrevivieron a los tres despliegues (luego se borraron).
  - Problemas resueltos por el camino: `sub` OIDC inmutable con IDs numéricos en la política de
    confianza, y política de permisos sin adjuntar al rol.

- Tareas 13–17 (autenticación, 18-11-2026): sesión en `sessionStorage`, `Authorization: Bearer`,
  pantallas Iniciar sesión / Crear cuenta, Cerrar sesión, `/api/auth` en Nginx y Vite, CSP,
  claves en Compose (`secretos/`) y K3s (Secrets `jwt-privada` / `jwt-publica`), API con
  `strategy: Recreate`. `./init.sh` verde (49 pruebas Vitest).
  - Punta a punta con Compose (imágenes locales de los tres repos) y con dos usuarios: 0 fallos
    (sin token 401, aislamiento 404 en ver/editar/eliminar, datos de A intactos, CSP, `/health`
    no publicado). La BD local del esquema antiguo migró sola: su curso previo quedó sin dueño e
    invisible (respaldo en el scratchpad de la sesión). Luego `docker compose down -v`.
  - Mismo script contra un K3s local: manifiestos anteriores (RollingUpdate, sin claves) →
    `desplegar.sh` con los nuevos: paso a Recreate, claves montadas y legibles, 0 fallos.

## Decisiones a confirmar

- Auth en el front: login muestra *Entrando…*; registro *Guardando…*. Validación mínima en el
  cliente (email con `@`, contraseña 8–128 en registro); el resto lo decide la API.
- `desplegar.sh` cambia una vez RollingUpdate → Recreate con `kubectl patch` (kustomize descarta
  `rollingUpdate: null`).

- CD: los tags vivos están en el clúster, no en el repo (`newTag` de `kustomization.yaml` solo
  para el primer despliegue manual). Usuario `despliegue` con kubeconfig de administrador de K3s
  (demo). El puerto 22 queda abierto solo a la IP del usuario (`IP-del-usuario/32`).

- K3s: Secrets `notas-db`, `pendientes-db` (contraseña hex) y `ghcr-credenciales` creados a
  mano; PVC de 1Gi por BD; requests/limits pequeños para t3.small; initContainer que espera a
  la BD; Ingress sin host (responde a la IP pública). Tags iniciales: notas `sha-9e41e442450a`,
  pendientes `sha-4851f6ed2e87`, panel `sha-331ae1dba308`.

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

- Si cambia la IP de la EC2: actualizar la variable `DEPLOY_HOST`. Al terminar la demo: borrar rol/política/OIDC de IAM y revocar los tokens de GitHub.
- Desplegar la autenticación (tarea 18): crear en la EC2 los Secrets `jwt-privada` y
  `jwt-publica` **antes** de hacer push; luego push de este repo y de ambas API.
- Decidir las mejoras de reconexión a BD de ambas API (ver `TASKS.md`).
- Revisar el diseño cuando se compartan las imágenes de referencia.
