# k8s — despliegue de UniPanel en K3s (un nodo, EC2)

Despliegue completo para una demo académica: `uni-panel`, `uni-notas-api`,
`uni-pendientes-api` y dos PostgreSQL independientes con volumen persistente.
El front se publica en `http://<IP pública de EC2>/` mediante el Ingress de Traefik que
trae K3s. Traefik escucha en el puerto 80 del nodo (ServiceLB de K3s), así que **no se
crea ningún balanceador de AWS**.

```
Internet ──► EC2 :80 ──► Traefik (K3s) ──► Ingress uni-panel ──► Service uni-panel:8080
                                                   Nginx ──► uni-notas-api:5000 ──► uni-notas-db:5432 (PVC 1Gi)
                                                         └─► uni-pendientes-api:3000 ──► uni-pendientes-db:5432 (PVC 1Gi)
```

## Archivos

| Archivo | Contenido |
|---|---|
| `kustomization.yaml` | Namespace `unipanel`, lista de recursos y **tags de imagen** desplegados |
| `namespace.yaml` | Namespace `unipanel` |
| `notas-db.yaml`, `pendientes-db.yaml` | Service headless + StatefulSet `postgres:17-alpine` con PVC `local-path` de 1Gi |
| `notas-api.yaml`, `pendientes-api.yaml` | Service + Deployment; espera a su BD (initContainer) y sondas en `/health` |
| `panel.yaml` | Service + Deployment de Nginx (:8080) + Ingress de Traefik en `/` |

**Secrets** (se crean a mano, nunca se guardan en el repo):

| Secret | Tipo | Clave | Uso |
|---|---|---|---|
| `notas-db` | generic | `password` | Contraseña de la BD de notas (la usan su PostgreSQL y su API) |
| `pendientes-db` | generic | `password` | Contraseña de la BD de pendientes |
| `ghcr-credenciales` | docker-registry | — | Descargar las imágenes privadas de `ghcr.io/abigaildurand` |

Las contraseñas deben ser solo letras y números (van dentro de `DATABASE_URL`).

## Despliegue manual

### 1. Instancia EC2

- Ubuntu Server 24.04 LTS, **t3.small como mínimo** (2 GB de RAM; t3.medium va más holgada),
  disco gp3 de 20 GB.
- Security group de entrada:
  - `22/tcp` solo desde tu IP (SSH).
  - `80/tcp` desde `0.0.0.0/0` (o solo desde las IP que verán la demo).
  - **No** abras `6443` (API de Kubernetes) ni los puertos de las BD.
- La IP pública cambia si detienes e inicias la instancia. Si necesitas que sea fija, asocia
  una Elastic IP (no es un balanceador).

### 2. Instalar K3s

```bash
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes            # debe salir Ready
mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown "$USER" ~/.kube/config
kubectl get storageclass               # debe existir local-path (default)
```

K3s ya incluye Traefik (Ingress), ServiceLB y la StorageClass `local-path`.

### 3. Copiar los manifiestos

Desde tu PC, en `universitario-front/`:

```bash
scp -r k8s ubuntu@<IP pública>:~/
```

### 4. Namespace y Secrets (en la EC2)

```bash
kubectl apply -f ~/k8s/namespace.yaml

kubectl -n unipanel create secret generic notas-db --from-literal=password="$(openssl rand -hex 24)"
kubectl -n unipanel create secret generic pendientes-db --from-literal=password="$(openssl rand -hex 24)"

# Token clásico de GitHub con el permiso read:packages (solo lectura de paquetes).
read -rsp "Token de GHCR: " GHCR_TOKEN; echo
kubectl -n unipanel create secret docker-registry ghcr-credenciales \
  --docker-server=ghcr.io --docker-username=abigailDurand --docker-password="$GHCR_TOKEN"
unset GHCR_TOKEN
```

Las contraseñas de las BD quedan solo en los Secrets del clúster. Para verlas:
`kubectl -n unipanel get secret notas-db -o jsonpath='{.data.password}' | base64 -d`.
**No borres esos Secrets** mientras quieras conservar los datos: PostgreSQL fija la
contraseña al crear la BD la primera vez.

### 5. Aplicar y comprobar

```bash
kubectl apply -k ~/k8s
kubectl -n unipanel rollout status deploy/uni-notas-api deploy/uni-pendientes-api deploy/uni-panel
kubectl -n unipanel get pods,pvc,ingress
```

Abre `http://<IP pública>/`. Desde la propia EC2: `curl -s localhost/api/notas/cursos`.

## Actualizar una imagen

Los tags son `sha-<12 primeros caracteres del commit>`, los que publica GitHub Actions
(y los que llegan en el aviso `servicio-actualizado`). Cambia `newTag` en
`kustomization.yaml` y vuelve a aplicar:

```bash
kubectl apply -k ~/k8s
```

## Datos persistentes

- Cada BD guarda sus datos en un PVC `local-path` (en la EC2, bajo
  `/var/lib/rancher/k3s/storage/`). Sobreviven a reinicios de pods, de K3s y de la instancia.
- Se **pierden** si borras el PVC, el namespace `unipanel` o la instancia/disco EC2.
- Copia de seguridad rápida:
  `kubectl -n unipanel exec uni-notas-db-0 -- pg_dump -U notas notas > notas.sql`
  (ídem con `uni-pendientes-db-0`, usuario y BD `pendientes`).

## Diagnóstico

```bash
kubectl -n unipanel get pods
kubectl -n unipanel describe pod <pod>        # ErrImagePull → revisa ghcr-credenciales y el tag
kubectl -n unipanel logs deploy/uni-notas-api
kubectl -n unipanel logs deploy/uni-pendientes-api
kubectl -n unipanel logs deploy/uni-panel
```

## Verificación hecha

Probado en K3s v1.32.2 (contenedor `rancher/k3s`) con las mismas imágenes:
todos los pods `Running`, PVC `Bound`, front y API por el puerto 80 de Traefik,
resumen 7.2 / 9.5 / `alcanzable`, fechas en `-05:00`, `/health` no publicado, y los datos
siguen ahí tras borrar los pods de ambas BD.

Al reiniciar una BD, las API se recuperan solas pero con un corte breve (ver `TASKS.md`):
`uni-notas-api` responde 500 una vez y `uni-pendientes-api` se reinicia (Kubernetes la levanta).

## Pendiente

- Conectar GitHub Actions al despliegue (después del despliegue manual).
