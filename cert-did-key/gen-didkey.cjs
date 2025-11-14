// gen-didkey.cjs
const { secp256k1 } = require("ethereum-cryptography/secp256k1");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { hexToBytes, bytesToHex } = require("ethereum-cryptography/utils");
const { base58 } = require("@scure/base");
const fs = require("fs");
const path = require("path");

/** Mini parser de INI (clave=valor), ignora comentarios y respeta comillas */
function getIniValue(iniPath, key) {
  if (!fs.existsSync(iniPath)) return null;
  const lines = fs.readFileSync(iniPath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    if (k !== key) continue;
    let v = m[2].trim();
    // quita comentarios al final de línea con # o ; si están separados por espacio
    v = v.replace(/\s+[;#].*$/, "");
    // quita comillas simples o dobles si envuelven
    v = v.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    return v.trim();
  }
  return null;
}

// 0) Ubicación del conf.ini (permite override por env CONF, default ../conf.ini)
const confPath = process.env.CONF
  ? path.resolve(process.env.CONF)
  : path.resolve(__dirname, "conf.ini");

// 1) Determinar fuente de la private key
let pkHex = (process.env.PRIV_HEX || "").trim().replace(/^0x/, "");

if (!pkHex) {
  // leer key_file desde conf.ini
  const keyFileFromIni = getIniValue(confPath, "key_file");
  let keyFilePath;

  if (keyFileFromIni && keyFileFromIni.length > 0) {
    // si la ruta del INI es relativa, resolverla contra el dir del conf.ini
    keyFilePath = path.isAbsolute(keyFileFromIni)
      ? keyFileFromIni
      : path.resolve(path.dirname(confPath), keyFileFromIni);
  } else {
    // fallback legacy al path anterior
    keyFilePath = path.resolve(__dirname, "../data/pk_issuer.txt");
  }

  if (!fs.existsSync(keyFilePath)) {
    console.error(
      `ERROR: no encontré el archivo de clave privada.\n` +
      `- Revisá "key_file" en ${confPath}\n` +
      `- O exportá PRIV_HEX con la clave en hex (sin 0x)\n` +
      `Intenté: ${keyFilePath}`
    );
    process.exit(1);
  }

  pkHex = fs.readFileSync(keyFilePath, "utf8").trim().replace(/^0x/, "");
}

if (pkHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(pkHex)) {
  console.error(
    "ERROR: la private key debe ser secp256k1 en hex de 64 chars (sin 0x)\n" +
    "- Opción A: PRIV_HEX=<hex> node gen-didkey.cjs\n" +
    `- Opción B: configurar key_file en ${confPath} y poner el hex en ese archivo\n`
  );
  process.exit(1);
}

const priv = hexToBytes(pkHex);

// 2) Public key comprimida (33 bytes)
const pubCompressed = secp256k1.getPublicKey(priv, true);

// 3) Multicodec secp256k1-pub (varint 0xE7 => E7 01) + base58
const header = new Uint8Array([0xE7, 0x01]);
const multicodec = new Uint8Array(header.length + pubCompressed.length);
multicodec.set(header, 0);
multicodec.set(pubCompressed, header.length);
const fingerprint = "z" + base58.encode(multicodec);
const did = `did:key:${fingerprint}`;

// 4) Ethereum address (chequeo)
const pubUncompressed = secp256k1.getPublicKey(priv, false); // 65 bytes (04 + X + Y)
const pubNoPrefix = pubUncompressed.slice(1);                // 64 bytes
const addr = "0x" + bytesToHex(keccak256(pubNoPrefix).slice(12)).toLowerCase();

// 5) Output
console.log("DID Key:             ", did);
console.log("verification_method: ", `${did}#${fingerprint}`);
console.log("Eth address (check): ", addr);
