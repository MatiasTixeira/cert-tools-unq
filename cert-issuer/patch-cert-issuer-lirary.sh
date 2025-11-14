#!/usr/bin/env bash
set -euo pipefail
SITEPKG="$(python - << 'PY'
import site; print(site.getsitepackages()[0])
PY
)"
FILE="$SITEPKG/cert_issuer/blockchain_handlers/ethereum/connectors.py"
grep -q 'from hexbytes import HexBytes' "$FILE" || sed -i '1i from hexbytes import HexBytes' "$FILE"
sed -i 's/sendRawTransaction/send_raw_transaction/g' "$FILE"
sed -i 's/getTransactionCount/get_transaction_count/g' "$FILE"
sed -i 's/self\.w3\.eth\.send_raw_transaction(tx)\.hex()/self.w3.eth.send_raw_transaction(HexBytes(tx)).hex()/' "$FILE"
echo "Parche aplicado en: $FILE"
