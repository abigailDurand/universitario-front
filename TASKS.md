# TASKS

Marca `[x]` solo cuando `./init.sh` termine en verde.
Referencia: `docs/spec.md`, `docs/architecture.md` y los SPEC de cada API.

## Pendientes

- _Ninguna._

## En curso

- _Ninguna._

## Mejoras detectadas en otros repos (no se tocan desde aquí; decidir el usuario)

- `notas-service`: tras reiniciar su BD responde **500 una vez** (conexión rota en el pool de
  SQLAlchemy). Propuesta: `pool_pre_ping=True` en el engine.
- `pendientes-service`: tras reiniciar su BD **el proceso se cae** (error no manejado del pool de
  `pg`) y Kubernetes lo reinicia (~30 s de 502). Propuesta: `pool.on('error', ...)` que solo registre.

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
- [x] 9. Manifiestos de K3s en `k8s/` (namespace, 2 PostgreSQL con PVC `local-path`, 2 API,
      panel e Ingress de Traefik; Secrets creados a mano). Probados en K3s v1.32.2 en contenedor.
- [x] 10. CD automático a K3s por SSH (OIDC de AWS, regla 22/tcp temporal /32, llave exclusiva,
      known_hosts estricto). Verificado en GitHub: merge a main del front → uni-panel; merge a main
      de cada API → aviso → solo ese servicio; PVC con el mismo UID y datos conservados.
- [x] 12. Despliegue manual en K3s en EC2 (t3.small, Ubuntu 26.04): funcionando por la IP pública.
      Ajustes necesarios: PostgreSQL como uid 70 (sin gosu), `startupProbe` en las BD y
      `appArmorProfile: Unconfined` en los pods (AppArmor de Ubuntu 26.04 bloquea señales).
- [x] 11. Nginx sin root (`nginx-unprivileged:1.27-alpine`) en el puerto 8080.
