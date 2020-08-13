'use strict';



// const AES = require('hsd/node_modules/bcrypto/lib/js/ciphers/aes');
// const {CBCCipher, CBCDecipher} = require('./ciphers/modes');

// /**
//  * Encrypt data with aes 256 cbc.
//  * @param {Buffer} data
//  * @param {Buffer} key
//  * @param {Buffer} iv
//  * @returns {Buffer}
//  */

// function encipher(data, key, iv) {
//   const ctx = new CBCCipher(new AES(256));
//   ctx.init(key, iv);
//   return Buffer.concat([ctx.update(data), ctx.final()]);
// }

// /**
//  * Decrypt data with aes 256 cbc.
//  * @param {Buffer} data
//  * @param {Buffer} key
//  * @param {Buffer} iv
//  * @returns {Buffer}
//  */

// function decipher(data, key, iv) {
//   const ctx = new CBCDecipher(new AES(256));
//   ctx.init(key, iv);
//   return Buffer.concat([ctx.update(data), ctx.final()]);




module.exports = {
  aes: require('hsd/node_modules/bcrypto/lib/aes'),
  pbkdf2: require('hsd/node_modules/bcrypto/lib/pbkdf2'),
  sha256: require('hsd/node_modules/bcrypto/lib/sha256'),
  random: require('hsd/node_modules/bcrypto/lib/random'),
  toBase64: (buffer) => {
    return buffer.toString('base64');
  }
};
