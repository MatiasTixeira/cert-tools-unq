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

trim() { sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
get_conf_val() {
  local key="$1" file="$2"
  local line val
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" || true)"
  [[ -z "$line" ]] && return 1
  val="${line#*=}"
  echo "$val" | trim | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

# --- conf.ini
[[ -f "$CONF" ]] || { echo "ERROR: no existe $CONF" >&2; exit 1; }
CONF_DIR="$(cd "$(dirname "$CONF")" && pwd)"

# --- issuer desde DID_KEY (env)
: "${DID_KEY:?ERROR: Debés exportar DID_KEY (p.ej. en .env: DID_KEY='did:key:z...')}"
issuer_raw="$(echo -n "$DID_KEY" | trim | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
issuer="${issuer_raw%%#*}"
[[ "${issuer%%:*}" == "did" ]] || { echo "ERROR: DID_KEY inválida: '$issuer_raw'" >&2; exit 1; }
echo "[info] issuer (DID_KEY): $issuer"

# --- unsigned_certificates_dir (desde conf.ini)
unsigned_dir_raw="$(get_conf_val "unsigned_certificates_dir" "$CONF" || true)"
[[ -n "${unsigned_dir_raw:-}" ]] || { echo "ERROR: 'unsigned_certificates_dir' no encontrado en $CONF" >&2; exit 1; }
unsigned_dir_raw="${unsigned_dir_raw%%#*}"
unsigned_dir_raw="$(echo "$unsigned_dir_raw" | trim | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"

if [[ "$unsigned_dir_raw" = /* ]]; then
  UNSIGNED_DIR="$unsigned_dir_raw"
else
  UNSIGNED_DIR="$CONF_DIR/$unsigned_dir_raw"
fi
[[ -d "$UNSIGNED_DIR" ]] || { echo "ERROR: no existe el directorio $UNSIGNED_DIR" >&2; exit 1; }
echo "[info] unsigned_certificates_dir: $UNSIGNED_DIR"

# --- reemplazo *|ISSUER|* en JSONs
shopt -s nullglob
files=("$UNSIGNED_DIR"/*.json)
shopt -u nullglob
if (( ${#files[@]} == 0 )); then
  echo "WARN: no se encontraron .json en $UNSIGNED_DIR"
else
  safe_issuer="${issuer//\\/\\\\}"; safe_issuer="${safe_issuer//&/\\&}"
  for f in "${files[@]}"; do
    sed -i "s/\*|ISSUER|\*/$safe_issuer/g" "$f"
    echo "[ok] actualizado: $f"
  done
fi

# --- RPC (desde env)
: "${SEPOLIA_RPC_URL:?ERROR: Debés exportar SEPOLIA_RPC_URL (p.ej. en .env: SEPOLIA_RPC_URL='https://sepolia.infura.io/v3/<API_KEY>')}"

# --- emitir
echo "[run] cert-issuer -c \"$CONF\" -v (usando SEPOLIA_RPC_URL y DID_KEY del entorno)"
cert-issuer -c "$CONF" -v
