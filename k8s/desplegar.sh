#!/usr/bin/env bash
# desplegar.sh — despliega UN servicio de UniPanel en K3s conservando los datos.
# Lo ejecuta GitHub Actions por SSH en la EC2 (usuario `despliegue`), con los manifiestos
# de `main` copiados junto a este script:
#
#   bash desplegar.sh <servicio> <tag> <dir-manifiestos>
#   servicio: uni-notas-api | uni-pendientes-api | uni-panel
#   tag:      sha-<12 hex>  (el que publica cada workflow en GHCR)
#
# - Los tags de los OTROS servicios se toman de lo que ya corre en el clúster, para que
#   desplegar uno no haga retroceder a los demás (el repo no guarda los tags vivos).
# - Nunca borra PVC ni StatefulSets: comprueba que los PVC de PostgreSQL son los mismos
#   (mismo UID) y siguen Bound antes y después.
# - Si el rollout del servicio falla, hace `kubectl rollout undo` y termina con error.
set -euo pipefail

NS=unipanel
REGISTRO=ghcr.io/abigaildurand
SERVICIOS=(uni-notas-api uni-pendientes-api uni-panel)

log()   { printf '[despliegue] %s\n' "$*" >&2; }
error() { printf '[despliegue] ERROR: %s\n' "$*" >&2; exit 1; }

[ $# -eq 3 ] || error "uso: desplegar.sh <servicio> <tag> <dir-manifiestos>"
SERVICIO=$1 TAG=$2 BASE=$3

case "$SERVICIO" in uni-notas-api|uni-pendientes-api|uni-panel) ;; *) error "servicio no permitido: $SERVICIO" ;; esac
[[ "$TAG" =~ ^sha-[0-9a-f]{12}$ ]] || error "tag con formato inválido: $TAG"
[ -f "$BASE/kustomization.yaml" ] || error "no hay kustomization.yaml en $BASE"

export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
kubectl get --raw /readyz >/dev/null || error "el API de K3s no responde"

tag_actual() {
  kubectl -n "$NS" get deploy "$1" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null \
    | sed -n 's/^.*:\(sha-[0-9a-f]\{12\}\)$/\1/p'
}
pvcs() {
  kubectl -n "$NS" get pvc -o jsonpath='{range .items[*]}{.metadata.name}={.metadata.uid}={.status.phase}{"\n"}{end}' | sort
}

PVC_ANTES=$(pvcs)
log "PVC antes:"; printf '%s\n' "${PVC_ANTES:-  (ninguno)}"

# Overlay temporal junto a la base: fija el tag nuevo del servicio y los tags vivos del resto.
OVERLAY="$(dirname "$BASE")/overlay"
rm -rf "$OVERLAY"; mkdir -p "$OVERLAY"
{
  echo "apiVersion: kustomize.config.k8s.io/v1beta1"
  echo "kind: Kustomization"
  echo "resources:"
  echo "  - ../$(basename "$BASE")"
  echo "images:"
  for s in "${SERVICIOS[@]}"; do
    if [ "$s" = "$SERVICIO" ]; then t=$TAG; else t=$(tag_actual "$s"); fi
    if [ -n "$t" ]; then
      echo "  - name: $REGISTRO/$s"
      echo "    newTag: $t"
      log "$s → $t$([ "$s" = "$SERVICIO" ] && echo '  (nuevo)')"
    fi
  done
} > "$OVERLAY/kustomization.yaml"

# Las API pasan de RollingUpdate a Recreate (no deben convivir dos versiones durante una
# migración). `kubectl apply` no puede quitar el `rollingUpdate` que guardó el clúster, así
# que se cambia aquí una sola vez; no reinicia pods.
for s in uni-notas-api uni-pendientes-api; do
  actual=$(kubectl -n "$NS" get deploy "$s" -o jsonpath='{.spec.strategy.type}' 2>/dev/null || true)
  if [ "$actual" = "RollingUpdate" ]; then
    log "$s: estrategia RollingUpdate → Recreate"
    kubectl -n "$NS" patch deploy "$s" --type=json       -p='[{"op":"remove","path":"/spec/strategy/rollingUpdate"},{"op":"replace","path":"/spec/strategy/type","value":"Recreate"}]'
  fi
done

ANTERIOR=$(tag_actual "$SERVICIO")
log "Aplicando manifiestos (${SERVICIO}: ${ANTERIOR:-sin desplegar} → ${TAG})"
kubectl apply -k "$OVERLAY"

log "Esperando a las BD"
kubectl -n "$NS" rollout status statefulset/uni-notas-db --timeout=240s
kubectl -n "$NS" rollout status statefulset/uni-pendientes-db --timeout=240s

log "Verificando el rollout de $SERVICIO"
if ! kubectl -n "$NS" rollout status "deploy/$SERVICIO" --timeout=300s; then
  kubectl -n "$NS" get pods -l "app.kubernetes.io/name=$SERVICIO" || true
  kubectl -n "$NS" logs "deploy/$SERVICIO" --tail=30 || true
  log "Rollout fallido: revirtiendo $SERVICIO"
  kubectl -n "$NS" rollout undo "deploy/$SERVICIO"
  kubectl -n "$NS" rollout status "deploy/$SERVICIO" --timeout=300s || true
  error "el rollout de $SERVICIO falló y se revirtió a ${ANTERIOR:-la versión previa}"
fi

# Los demás Deployments deben seguir sanos (por si el commit cambió manifiestos).
for s in "${SERVICIOS[@]}"; do
  [ "$s" = "$SERVICIO" ] || kubectl -n "$NS" rollout status "deploy/$s" --timeout=300s
done

PVC_DESPUES=$(pvcs)
log "PVC después:"; printf '%s\n' "${PVC_DESPUES:-  (ninguno)}"
[ "$PVC_ANTES" = "$PVC_DESPUES" ] || error "los PVC cambiaron durante el despliegue"
if printf '%s\n' "$PVC_DESPUES" | grep -qv '=Bound$'; then error "hay PVC que no están Bound"; fi
[ "$(printf '%s\n' "$PVC_DESPUES" | grep -c '=Bound$')" -ge 2 ] || error "faltan los PVC de las BD"

log "Desplegado: $REGISTRO/$SERVICIO:$TAG"
kubectl -n "$NS" get deploy,statefulset -o wide | sed 's/^/  /'
