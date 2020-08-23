'use strict';

const cipher = require('hsd/node_modules/bcrypto/lib/cipher');
const {Cipher, Decipher} = cipher;
const name = 'AES-256-GCM';

module.exports = {
  aes: {
    encipher: (data, key, iv) => {
      const ctx = new Cipher(name);
      ctx.init(key, iv);
      return Buffer.concat([ctx.update(data), ctx.final(), ctx.getAuthTag()]);
    },
    decipher: (data, key, iv) => {
      const ctx = new Decipher(name);
      ctx.init(key, iv);
      const tag = data.slice(-16);
      data = data.slice(0, -16);
      ctx.setAuthTag(tag);
      return Buffer.concat([ctx.update(data), ctx.final()]);
    }
  },
  pbkdf2: require('hsd/node_modules/bcrypto/lib/pbkdf2'),
  sha256: require('hsd/node_modules/bcrypto/lib/sha256'),
  random: require('hsd/node_modules/bcrypto/lib/random'),
  toBase64: (buffer) => {
    return buffer.toString('base64');
  }
};
