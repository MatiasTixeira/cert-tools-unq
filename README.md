# cert-tools-unq

cert-tools ya modificado para nuestro proyecto - Templates y CSV ya hechos

## Configuración

Se requiere tener un archivo conf.ini con la configuración necesaria.
El archivo conf.ini se encuentra en el directorio `cert-tools/conf.ini`.
Agregar la propiedad `issuer_id` que será la URL del archivo issuer.json que contendrá el profile del emisor.
De momento por parcticidad para realizar las pruebas se encunetra en el repositorio en la rama `issuerTestConfiguration`:

`https://raw.githubusercontent.com/MatiasTixeira/cert-tools-unq/issuerTestConfiguration/cert-issuer/issuer.json`

El issuer.json contendrá la siguiente informacion
```json
{
  "@context": [
    "https://w3id.org/openbadges/v2",
    "https://w3id.org/blockcerts/v3"
  ],
  "id": "https://raw.githubusercontent.com/MatiasTixeira/cert-tools-unq/issuerTestConfiguration/cert-did-key/issuer.json",
  "type": "Profile",
  "name": "Universidad Nacional de Quilmes",
  "url": "https://www.unq.edu.ar/",
  "description": "Issuer de prueba para Blockcerts v3 en Sepolia usando did:key y dirección 0x8f64f4...",
  "publicKey": [
    {
      "id": "ecdsa-koblitz-pubkey:0x8f64f436d9c0806a7662df1541a47e5ff3e36923",
      "created": "2025-01-01T00:00:00Z"
    }
  ]
}
```

```ini
issuer_id = https://raw.githubusercontent.com/MatiasTixeira/cert-tools-unq/issuerTestConfiguration/cert-issuer/issuer.json
```

## Templates

Se requiere tener un archivo template con la configuración necesaria.
El archivo template se encuentra en el directorio `cert-tools/sample_data/certificate_templates/test.json`.
La versión V3 de los certificados requiere que el template tenga el siguiente formato:

```json
{
    "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/blockcerts/v3",
        {
            "alumniOf": { "@id": "https://schema.org/alumniOf", "@type": "@id" },
            "finalGrade": "https://schema.org/gradeValue"
        }
    ],
    "type": ["VerifiableCredential", "BlockcertsCredential"],
    "issuer": "https://raw.githubusercontent.com/MatiasTixeira/cert-tools-unq/issuerTestConfiguration/cert-issuer/issuer.json",
    "issuanceDate": "*|DATE|*",
    "id": "urn:uuid:*|CERTUID|*",
    "credentialSubject": {
        "id": "ecdsa-koblitz-pubkey:*|PUBKEY|*",
        "alumniOf": {
            "id": "*|ALUMNI_OF|*"
        },
        "finalGrade": "*|FINAL_GRADE|*"
    },
    "nonce": "sec:nonce"
}
```
Dentro del @context se define el schema de los campos que se van a usar en el template.
La propiedad `issuer` define la URL del archivo issuer.json que contendrá el profile del emisor.

## Generar unsigned certificates

```bash
instantiate-certificate-batch -c conf.ini
```

Se generaran los certificados en el directorio `sample-data/unsigned_certificates`.


# cert-issuer

cert-issuer es la libreria que se encarga de emitir los certificados.

Para su funcionamiento requiere:

- Entorno python virtual customizado para poder ejecutar cert-issuer.
- Clave privada de la cuenta que se usará para emitir los certificados (en un archivo).
- Configuración de variables de entorno (archivo `.env`).
    + `SEPOLIA_RPC_URL` es la url base de Infura.
- Archivo conf.ini con la configuración necesaria.
    + `issuing_address` es la dirección publica de la cuenta que se usará para emitir los certificados.
    + `verification_method` hará referencia al método de verificación via clave pública del emisor. 
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

### Configuración:  `conf.ini` y `.env`

Agregar al archivo `conf.ini` las propiedades `issuing_address` y `verification_method`, por ejemplo:

(0x8f64f436d9c0806a7662df1541a47e5ff3e36923 es la dirección publica de la cuenta que se usará para emitir los certificados)

```ini
issuing_address = 0x8f64f436d9c0806a7662df1541a47e5ff3e36923    
verification_method = ecdsa-koblitz-pubkey:0x8f64f436d9c0806a7662df1541a47e5ff3e36923
```

`issuing_address` es la dirección publica de la cuenta que se usará para emitir los certificados.
`verification_method` es el DID Key que se generó con el comando `npm run gen-didkey`.


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
Por defecto el script buscará el archivo  `.env` en el directorio actual.
Se puede especifcar la ruta del archivo `.env` con la opción `-e <path-to-env-file>`.

