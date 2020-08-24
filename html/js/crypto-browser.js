/* eslint-env browser */
'use strict';

const browserCrypto = {
  sha256: 'SHA-256',

  pbkdf2: {
    derive: async (hash, passphrase, salt, iterations, length) => {
      const enc = new TextEncoder();
      const master = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        {name: 'PBKDF2'},
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 10000000,
          hash
        },
        master,
        {name: 'AES-GCM', length: length * 8},
        true,
        ['encrypt', 'decrypt']
      );
      return key;
    }
  },

  random: {
    randomBytes: (bytes) => {
      return window.crypto.getRandomValues(new Uint8Array(bytes));
    }
  },

  aes: {
    encipher: (plaintext, key, iv) => {
      return window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        plaintext
      );
    },
    decipher: async (ciphertext, key, iv) => {
      const buffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        ciphertext
      );
      buffer.toString = () => {
        return new TextDecoder('ascii').decode(buffer);
      };
      return buffer;
    }
  },

  toBase64: (bytes) => {
    const buf = new Uint8Array(bytes);
    return bytesToBase64(buf);
  }
};
