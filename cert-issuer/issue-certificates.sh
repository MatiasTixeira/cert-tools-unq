#!/usr/bin/env bash
set -euo pipefail

# Defaults
CONF="./conf.ini"
ENVFILE="./.env"

# Args: -c conf.ini  -e .env
while getopts ":c:e:" opt; do
  case "$opt" in
    c) CONF="$OPTARG" ;;
    e) ENVFILE="$OPTARG" ;;
    \?) echo "Uso: $0 [-c ruta/a/conf.ini] [-e ruta/a/.env]"; exit 2 ;;
  esac
done
shift $((OPTIND-1))

# --- Cargar .env si existe
if [[ -f "$ENVFILE" ]]; then
  echo "[info] Cargando variables desde $ENVFILE"
  # Exporta todo lo que defina el .env (líneas tipo KEY=VAL o export KEY=VAL)
  set -a
  # shellcheck disable=SC1090
  source "$ENVFILE"
  set +a
else
  echo "[warn] No se encontró .env en: $ENVFILE (se continúa sin cargar .env)"
fi

# --- RPC (desde env)
: "${SEPOLIA_RPC_URL:?ERROR: Debés exportar SEPOLIA_RPC_URL (p.ej. en .env: SEPOLIA_RPC_URL='https://sepolia.infura.io/v3/<API_KEY>')}"

# --- emitir
echo "[run] cert-issuer -c \"$CONF\" -v (usando SEPOLIA_RPC_URL y DID_KEY del entorno)"
cert-issuer -c "$CONF" -v
