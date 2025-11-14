# cert-tools-unq

cert-tools ya modificado para nuestro proyecto - Templates y CSV ya hechos

# cert-issuer

cert-issuer es la libreria que se encarga de emitir los certificados.

Para su funcionamiento requiere:

- Entorno python virtual customizado para poder ejecutar cert-issuer.
- Clave privada de la cuenta que se usará para emitir los certificados (en un archivo).
- DID Key generada en base a la clave privada.
- Configuración de variables de entorno (archivo `.env`).
    + `SEPOLIA_RPC_URL` es la url base de Infura.
    + `DID_KEY` es la DID Key generada en base a la clave privada.
- Archivo conf.ini con la configuración necesaria.
    + `issuing_address` es la dirección publica de la cuenta que se usará para emitir los certificados.
    + `verification_method` es el DID Key que se generó con el comando `npm run gen-didkey` (carpeta didkey). 
    + `key_file` es el archivo que contiene la clave privada de la cuenta que se usará para emitir los certificados.    


## Preparar entorn Python

### Crear virtual environment

```bash
python3 -m venv ~/venvs/certissuer-v6
source ~/venvs/certissuer-v6/bin/activate
python -m pip install --upgrade pip
```

### Instalar dependencias
```bash
python -m pip install \
  "cert-issuer==3.13.0" \
  "blockcerts-merkletools==1.0.4" \
  "web3==6.20.4" \
  "hexbytes>=0.3.1"
```

### Aplicar PATCH a libreria cert_issuer
```bash
FILE="/home/$USER/venvs/certissuer-v6/lib/python3.10/site-packages/cert_issuer/blockchain_handlers/ethereum/connectors.py"

# imports
grep -q 'from hexbytes import HexBytes' "$FILE" || sed -i '1i from hexbytes import HexBytes' "$FILE"

# renombres de métodos
sed -i 's/\.sendRawTransaction/\.send_raw_transaction/g' "$FILE"
sed -i 's/\.getTransactionCount/\.get_transaction_count/g' "$FILE"
sed -i 's/\.getBalance/\.get_balance/g' "$FILE"

# asegurar bytes en el envío (si hay una línea con tx). Ajusta el patrón si difiere.
sed -i 's/self\.w3\.eth\.send_raw_transaction(tx)\.hex()/self.w3.eth.send_raw_transaction(HexBytes(tx)).hex()/' "$FILE"
```

## Configuración clave privada
Se necesita tener la clave privada de la cuenta que se va a usar para emitir los certificados.
La clave privada se instalará en un directorio seguro y obviamente no será parte del repositorio.
Copia el valor de la clave privada de la cuenta en MetaMask en un archivo, por ej, `~/.certissuer/pk_issuer.txt` y agrega
a conf.ini la línea la propiedad `key_file`:
`key_file = ~/.certissuer/pk_issuer.txt`


## Generar DID Key
```bash
npm install
npm run gen-didkey
```
Al ejecutar `npm run gen-didkey` obtendremos un output similar a:

```bash
DID Key: did:key:zQ3shMcjd3ALtJBW7XvrHKViqqprG9NKAUnugDHTtqv9BcJr4
verification_method: did:key:zQ3shMcjd3ALtJBW7XvrHKViqqprG9NKAUnugDHTtqv9BcJr4#zQ3shMcjd3ALtJBW7XvrHKViqqprG9NKAUnugDHTtqv9BcJr4
Eth address (check):  0x8f64f436d9c0806a7662df1541a47e5ff3e36923
```
Agregar al archivo conf.ini las propiedades, por ejemplo:

```ini
issuing_address = 0x8f64f436d9c0806a7662df1541a47e5ff3e36923    
verification_method = did:key:zQ3shMcjd3ALtJBW7XvrHKViqqprG9NKAUnugDHTtqv9BcJr4#zQ3shMcjd3ALtJBW7XvrHKViqqprG9NKAUnugDHTtqv9BcJr4
```

`issuing_address` es la dirección publica de la cuenta que se usará para emitir los certificados.
`verification_method` es el DID Key que se generó con el comando `npm run gen-didkey`.

Agregar la did key como variable de entorno en el archivo `.env`.

```ini
DID_KEY="did:key:zQ3shMcjd3ALtJBW7XvrHKViqqprG9NKAUnugDHTtqv9BcJr4"
```

## Crear API Key de Infura
Se necesita tener una API Key de Infura para poder emitir los certificados.
Agregar la url base de Infura como variable de entorno en el archivo `.env`.

```ini
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/69c54f6a69174135bdd2e522d13d3eef"
```

## Firmar los certificados

Una vez configurados correctamente los archivos `conf.ini` y `.env`, se puede firmar los certificados con el comando:

```bash
./issue-certificates.sh
```
Por defecto el script buscará los archivos `conf.ini` y `.env` en el directorio actual.
Se puede especifcar la ruta del archivo `.env` con la opción `-e <path-to-env-file>`.
Se puede especifcar la ruta del archivo `conf.ini` con la opción `-c <path-to-conf-file>`.

