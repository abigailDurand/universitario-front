#!/usr/bin/env bash
# init.sh — Verificación del repositorio: arnés, dependencias, lint, pruebas y build.
# No levanta Docker: la integración local se prueba con `docker compose` (ver README).

set -u
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { printf "${GREEN}[OK]${NC}   %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC} %s\n" "$1"; }

cd "$(dirname "$0")"
EXIT_CODE=0

echo "── Archivos del arnés ──"
for f in AGENTS.md CLAUDE.md README.md TASKS.md progress/current.md docs/spec.md docs/architecture.md; do
  if [ -f "$f" ]; then ok "$f"; else fail "Falta $f"; EXIT_CODE=1; fi
done

echo ""
echo "── Dependencias ──"
if ! command -v npm >/dev/null 2>&1; then
  fail "npm no está instalado (se requiere Node 24)"; exit 1
fi
if [ ! -d node_modules ]; then
  if npm ci --no-audit --no-fund >/dev/null; then ok "npm ci"; else fail "npm ci"; exit 1; fi
else
  ok "node_modules presente"
fi

echo ""
echo "── Lint ──"
if npm run --silent lint; then ok "eslint"; else fail "eslint"; EXIT_CODE=1; fi

echo ""
echo "── Pruebas ──"
if npm run --silent test; then ok "vitest"; else fail "vitest"; EXIT_CODE=1; fi

echo ""
echo "── Build ──"
if npm run --silent build >/dev/null; then ok "vite build"; else fail "vite build"; EXIT_CODE=1; fi
rm -rf dist

echo ""
echo "── Manifiestos k8s ──"
if command -v kubectl >/dev/null 2>&1; then
  if kubectl kustomize k8s >/dev/null; then ok "kubectl kustomize k8s"; else fail "kubectl kustomize k8s"; EXIT_CODE=1; fi
else
  ok "kubectl no instalado: se omite la validación de k8s/"
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then ok "Listo"; else fail "Hay errores"; fi
exit $EXIT_CODE
