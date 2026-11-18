# TASKS

Marca `[x]` solo cuando `./init.sh` termine en verde.
Referencia: `docs/spec.md`, `docs/architecture.md` y los SPEC de cada API.

## Pendientes

- _Ninguna._

## En espera (requiere confirmar clúster y registro de imágenes)

- [ ] 9. Manifiestos Kubernetes en `k8s/` (los tres servicios y sus BD; secretos fuera del repo).
- [ ] 10. Workflows en `.github/workflows/` (build, push de imágenes y despliegue).

## Por definir (requiere decisión del usuario)

- Imágenes de referencia aprobadas: no están en el repo; el diseño sigue la paleta de la SPEC.
- Límite de longitud del nombre de curso/evaluación: la API de notas no define ninguno.
- Textos propios del front no fijados por la SPEC (ver `progress/current.md`).

## Hechas

- [x] 1. Estructura inicial: Vite + React, navegación, clientes de `src/api/`, proxy de Vite,
      Nginx con ruta completa, Dockerfile, docs y `init.sh`.
- [x] 2. Pruebas con Vitest + Testing Library (jsdom) en `init.sh`: http, filtros, números, fechas,
      navegación, modal, Mis notas y Mis pendientes.
- [x] 3. Mis notas: cursos (crear, editar, eliminar con confirmación; selección del primero).
- [x] 4. Mis notas: evaluaciones (tabla, crear, editar, eliminar; nota vacía → null, 0 se conserva).
- [x] 5. Mis notas: resumen tal como lo entrega `GET /resumen`, con nota objetivo editable.
- [x] 6. Mis pendientes: filtros combinables, tabla, `vencido` y fechas en hora de Perú.
- [x] 7. Mis pendientes: crear, editar (solo cambios), completar/reabrir y eliminar con confirmación.
- [x] 8. Integración local con Docker Compose (3 servicios + 2 PostgreSQL), probada punta a punta.
- [x] 11. Nginx sin root (`nginx-unprivileged:1.27-alpine`) en el puerto 8080.
