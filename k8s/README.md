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

- Ubuntu Server (probado en 26.04 LTS), **t3.small como mínimo** (2 GB de RAM), disco gp3 de
  20 GB o más. **Una t3.micro (1 GB) no alcanza**: K3s se cae y las BD no terminan de arrancar.
- Security group de entrada:
  - `22/tcp` solo desde tu IP (SSH).
  - `80/tcp` desde `0.0.0.0/0` (o solo desde las IP que verán la demo).
  - **No** abras `6443` (API de Kubernetes) ni los puertos de las BD.
- La IP pública cambia si detienes e inicias la instancia. Si necesitas que sea fija, asocia
  una Elastic IP (no es un balanceador).

### 2. Instalar K3s

Conéctate con `ssh -i <llave>.pem ubuntu@<IP pública>` (en Windows la llave debe ser legible
solo por tu usuario: `icacls <llave>.pem /inheritance:r` y `/grant:r "$env:USERNAME:R"`).

```bash
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes            # debe salir Ready

# kubectl sin sudo (el kubectl de K3s necesita KUBECONFIG apuntando a la copia del usuario)
mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown "$USER" ~/.kube/config && chmod 600 ~/.kube/config
echo 'export KUBECONFIG=$HOME/.kube/config' >> ~/.bashrc && export KUBECONFIG=$HOME/.kube/config
kubectl get storageclass               # debe existir local-path (default)

# Swap de 2 GB como colchón de memoria (K3s la admite sin cambios)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf && sudo sysctl --system
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

## AppArmor en Ubuntu 26.04 (por qué los pods llevan `appArmorProfile: Unconfined`)

En la EC2 con Ubuntu 26.04 (kernel 7.0), el perfil AppArmor `cri-containerd.apparmor.d` de
containerd **bloquea las señales entre procesos del mismo contenedor**
(`dmesg`: `apparmor="DENIED" operation="signal" ... peer="cri-containerd.apparmor.d//&unconfined"`).
Consecuencias observadas: `gosu` (entrypoint de PostgreSQL) se queda al 100 % de CPU,
PostgreSQL falla con `could not signal for checkpoint: Permission denied`, y Nginx/gunicorn
se reinician. Por eso los cinco pods declaran `securityContext.appArmorProfile: Unconfined`.
El resto de protecciones se mantiene (usuario sin root, sin escalada de privilegios), y
PostgreSQL corre directamente como `postgres` (uid 70), sin `gosu`.

Si una BD quedó a medio inicializar (por ejemplo, tras matarla durante el primer arranque),
y **todavía no tiene datos**, se reinicia limpia así (borra sus datos):

```bash
kubectl -n unipanel scale statefulset uni-notas-db --replicas=0
kubectl -n unipanel delete pvc datos-uni-notas-db-0
kubectl apply -k ~/k8s && kubectl -n unipanel scale statefulset uni-notas-db --replicas=1
```

## Diagnóstico

```bash
kubectl -n unipanel get pods
kubectl -n unipanel describe pod <pod>        # ErrImagePull → revisa ghcr-credenciales y el tag
kubectl -n unipanel logs deploy/uni-notas-api
kubectl -n unipanel logs deploy/uni-pendientes-api
kubectl -n unipanel logs deploy/uni-panel
```

## Verificación hecha

**EC2 t3.small, Ubuntu 26.04, K3s v1.37.2** (18-11-2026): los cinco pods `Running`, acceso por
`http://<IP pública>/`, resumen 7.2 / 9.5 / `alcanzable`, fecha `Z` → `-05:00`, cambio de
estado de un pendiente y `DELETE` 204. Antes se probó también en:

Probado en K3s v1.32.2 (contenedor `rancher/k3s`) con las mismas imágenes:
todos los pods `Running`, PVC `Bound`, front y API por el puerto 80 de Traefik,
resumen 7.2 / 9.5 / `alcanzable`, fechas en `-05:00`, `/health` no publicado, y los datos
siguen ahí tras borrar los pods de ambas BD.

Al reiniciar una BD, las API se recuperan solas pero con un corte breve (ver `TASKS.md`):
`uni-notas-api` responde 500 una vez y `uni-pendientes-api` se reinicia (Kubernetes la levanta).

## CD automático (GitHub Actions → K3s por SSH)

| Origen | Workflow | Despliega |
|---|---|---|
| Merge/push a `main` de `universitario-front` | `ci-publicar.yml` → pruebas → imagen → `desplegar.yml` | `uni-panel` |
| Merge/push a `main` de `notas-service` / `pendientes-service` | su `ci-publicar-avisar.yml` publica y envía `servicio-actualizado` → `servicio-actualizado.yml` valida → `desplegar.yml` | solo ese servicio |

Los pull requests solo ejecutan pruebas. `desplegar.yml` comprueba además que el evento sea
`push` o `repository_dispatch` y la rama `main`.

**Cómo entra a la EC2:**
1. AWS por OIDC con el rol `vars.AWS_ROLE_ARN` (sin Access Keys). El rol solo puede añadir/quitar
   reglas del SG `vars.AWS_SG_ID` (`vars.AWS_REGION`) y solo lo puede asumir `main` de este repo.
   **Ojo:** el repo emite el `sub` en formato inmutable (con IDs numéricos), así que la política
   de confianza debe usar exactamente
   `repo:abigailDurand@127162244/universitario-front@1462113526:ref:refs/heads/main`
   (se consulta con `gh api repos/abigailDurand/universitario-front/actions/oidc/customization/sub`).
   Con el formato antiguo sin IDs, AWS responde `Not authorized to perform sts:AssumeRoleWithWebIdentity`.
2. Abre `22/tcp` solo para la IP del runner (`/32`, descripción `gha-despliegue-temporal`) y la
   cierra al final **aunque falle**. Al empezar borra reglas temporales que hayan quedado.
3. SSH como usuario `despliegue` con la llave exclusiva `secrets.DEPLOY_SSH_KEY` (opción
   `restrict` en `authorized_keys`) y `StrictHostKeyChecking yes` contra
   `secrets.DEPLOY_KNOWN_HOSTS` (alias `unipanel-ec2`, independiente de la IP `vars.DEPLOY_HOST`).
4. Copia `k8s/` de `main` y ejecuta `k8s/desplegar.sh <servicio> <tag>`:
   - el servicio indicado recibe el tag nuevo; los otros conservan el tag que **ya corre en el
     clúster** (el `newTag` de `kustomization.yaml` solo sirve para el primer despliegue manual);
   - espera `rollout status`; si falla hace `rollout undo` y el job termina en error;
   - compara nombre, UID y estado de los PVC antes y después: si cambian, falla. Nunca borra PVC.

Un solo despliegue a la vez (`concurrency: despliegue-k3s`, los siguientes esperan).

**Configuración necesaria** (en `universitario-front`):

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | Llave privada ed25519 de despliegue (solo existe ahí) |
| Secret | `DEPLOY_KNOWN_HOSTS` | `unipanel-ec2 ssh-ed25519 …` (clave pública del host de la EC2) |
| Variable | `AWS_ROLE_ARN` | `arn:aws:iam::<cuenta>:role/unipanel-despliegue-sg` |
| Variable | `AWS_REGION` | `us-east-1` |
| Variable | `AWS_SG_ID` | ID del Security Group de la EC2 |
| Variable | `DEPLOY_HOST` | IP pública actual de la EC2 (**actualizar si cambia**) |

En la EC2: usuario `despliegue` con `~/.kube/config` (copia de `/etc/rancher/k3s/k3s.yaml`)
y la clave pública de despliegue en `~/.ssh/authorized_keys`.

Al terminar la demo: eliminar el rol, la política y el proveedor OIDC de IAM, y revocar los
tokens de GitHub (`PANEL_DISPATCH_TOKEN` y el de GHCR).
