# k8s — despliegue completo

Aquí se centralizarán los manifiestos de Kubernetes de los tres componentes
(`uni-panel`, `uni-notas-api`, `uni-pendientes-api`) y sus BD.

**Todavía no hay manifiestos.** Se escribirán después de confirmar:

- El clúster de destino (tipo, versión, Ingress disponible).
- El registro de imágenes y los nombres/etiquetas de las imágenes.
- Cómo se entregan los secretos (`DATABASE_URL` de cada API, credenciales de PostgreSQL).
  En el repositorio nunca se guardan valores de secretos.

Requisitos ya fijados por la arquitectura (ver `../docs/architecture.md`):

- Services con nombre `uni-notas-api` (puerto 5000) y `uni-pendientes-api` (puerto 3000),
  porque Nginx usa esos nombres.
- Sondas de Kubernetes contra `GET /health` de cada API, directamente en el servicio.
- Solo `uni-panel` se expone fuera del clúster.
