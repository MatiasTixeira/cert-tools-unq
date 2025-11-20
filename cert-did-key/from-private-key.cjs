// from-private-key.cjs

const secp = require('@noble/secp256k1');
const { keccak256 } = require('ethereum-cryptography/keccak');
const { base58 } = require('@scure/base');

const privHex = '5ac7ad022d1883ab17ffce80d84d9bf76bc493309f0fb01b40c3189fb4083581';
const priv = Uint8Array.from(Buffer.from(privHex, 'hex'));

// 1) Public key (uncompressed) para Ethereum
const pubUncompressed = secp.getPublicKey(priv, false); // 65 bytes, empieza con 0x04
const pubNoPrefix = pubUncompressed.slice(1); // sacamos el 0x04

// 2) Ethereum address
const hash = keccak256(pubNoPrefix);
const ethAddress = '0x' + Buffer.from(hash.slice(-20)).toString('hex');
console.log('ETH address:', ethAddress);

// 3) Public key (compressed) para did:key
const pubCompressed = secp.getPublicKey(priv, true); // 33 bytes

// 4) Multicodec secp256k1-pub: 0xe7 0x01 (uvarint)
const prefix = Uint8Array.from([0xe7, 0x01]);
const multi = new Uint8Array(prefix.length + pubCompressed.length);
multi.set(prefix, 0);
multi.set(pubCompressed, prefix.length);

// 5) Multibase base58btc
const fingerprint = 'z' + base58.encode(multi); // base58btc
const didKey = 'did:key:' + fingerprint;
console.log('did:key =', didKey);
