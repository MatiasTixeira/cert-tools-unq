#!/usr/bin/env node
// addr-from-didkey.cjs
(async () => {
  const die = (m) => { console.error('[addr-from-didkey] ERROR:', m); process.exit(1); };

  const DID = (process.argv[2] || process.env.DID || '').trim();
  if (!/^did:key:z/.test(DID)) die('Proveé un did:key válido (did:key:z...)');

  try {
    const { base58btc } = await import('multiformats/bases/base58');
    const { keccak256 } = await import('ethereum-cryptography/keccak.js');
    const EC = require('elliptic').ec;
    const ec = new EC('secp256k1');

    const fp = DID.split(':').pop();      // ej: zQ3s...
    // >>> CORREGIDO: mantener la 'z'
    const multicodec = base58btc.decode(fp);

    if (multicodec.length < 35) die(`Multicodec demasiado corto (${multicodec.length} bytes)`);
    if (multicodec[0] !== 0xe7 || multicodec[1] !== 0x01) {
      die(`El did:key no es secp256k1 (esperado 0xe7 0x01, recibido 0x${multicodec[0].toString(16)} 0x${multicodec[1].toString(16)})`);
    }

    const pubCompressed = Buffer.from(multicodec.slice(2)); // 33 bytes
    if (pubCompressed.length !== 33) die(`PubKey comprimida inválida (${pubCompressed.length} bytes)`);

    const key = ec.keyFromPublic(pubCompressed, 'hex');
    const uncompressed = Buffer.from(key.getPublic(false, 'array')); // 65 bytes: 0x04|X|Y
    const pubNoPrefix = uncompressed.slice(1); // 64 bytes

    const hash = Buffer.from(keccak256(pubNoPrefix)); // 32 bytes
    const address = '0x' + hash.slice(12).toString('hex');
    console.log(address);
  } catch (e) {
    die(e?.message || e);
  }
})();
