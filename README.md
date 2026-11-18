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

## Verificación

```bash
./init.sh
```
