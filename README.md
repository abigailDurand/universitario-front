# universitario-front — UniPanel (`uni-panel`)

Front React (Vite) servido por Nginx sin root en el puerto 8080. Pantallas *Mis notas*
(`uni-notas-api`) y *Mis pendientes* (`uni-pendientes-api`). El navegador solo habla con
Nginx, que reenvía `/api/notas` y `/api/pendientes` con la ruta completa. Ver `docs/`.

## Desarrollo

```bash
npm ci
npm run dev        # proxy de Vite hacia 127.0.0.1:5000 y 127.0.0.1:3000
npm test
```

Destinos del proxy configurables con `NOTAS_API_URL` y `PENDIENTES_API_URL`.

## Integración local (Docker Compose)

```bash
cp .env.example .env        # completa las contraseñas (solo letras y números)
docker compose up -d --build
# http://127.0.0.1:8080
docker compose down         # -v borra también los datos
```

Levanta `uni-panel`, `uni-notas-api`, `uni-pendientes-api` (desde `../notas-service` y
`../pendientes-service`) y una PostgreSQL para cada API. Solo se publica `uni-panel`.

## CI/CD (`.github/workflows/`)

- `ci-publicar.yml`: en pull request hacia `main` ejecuta `./init.sh`; en push a `main`, si pasa,
  publica `ghcr.io/abigaildurand/uni-panel:sha-<12 primeros del SHA>` con el `GITHUB_TOKEN`.
- `servicio-actualizado.yml`: recibe el `repository_dispatch` (`servicio-actualizado`) que envían
  `uni-notas-api` y `uni-pendientes-api` tras publicar su imagen. Valida `servicio`, `imagen`,
  `tag` y `commit` y los muestra en el resumen de la ejecución (pestaña *Actions*).
- El despliegue a Kubernetes se añadirá cuando se confirme el clúster.
- El aviso lo envía cada API con su secret `PANEL_DISPATCH_TOKEN` (configurado en el repo de
  cada API, no aquí).

## Verificación

```bash
./init.sh
```
