'use strict';

const assert = require('assert');

const hd = require('hsd/lib/hd/hd');
const KeyRing = require('hsd/lib/primitives/keyring');
const Coin = require('hsd/lib/primitives/coin');
const MTX = require('hsd/lib/primitives/mtx');
const resource = require('hsd/lib/dns/resource');
const Output = require('hsd/lib/primitives/output');

const ITERATIONS = 10000000;
const SALT = 'pinkie-swear-hns';

class HNSWallet {
  constructor(phrase, main = false, backend) {
    let type = 5355;
    this.network = 'regtest';
    if (main) {
      type = 5353;
      this.network = 'main';
    }

    this.crypto = backend;

    this.phrase = phrase;
    this.mnemonic = hd.Mnemonic.fromPhrase(phrase);
    this.master = hd.fromMnemonic(this.mnemonic);
    this.account =
      this.master.derive(44, true).derive(type, true).derive(0, true);
    this.receive = this.account.derive(0, false).derive(0, false);
    this.ring = KeyRing.fromPrivate(this.receive.privateKey);
    this.address = this.ring.getAddress().toString(this.network);

    this.resource = {
      records: []
    };
  }

  async encryptSeed(passphrase) {
    const pbkey = await this.crypto.pbkdf2.derive(
      this.crypto.sha256,
      passphrase,
      SALT,
      ITERATIONS,
      32
    );
    const raw = Buffer.from(this.phrase, 'ascii');
    const iv = this.crypto.random.randomBytes(16);
    const cipher = await this.crypto.aes.encipher(raw, pbkey, iv);
    return {iv, cipher};
  }

  async getEncryptedSeedResource(passphrase) {
    const {iv, cipher} = await this.encryptSeed(passphrase);
    const txt = [
      'pinkie',
      this.crypto.toBase64(iv),
      this.crypto.toBase64(cipher)
    ];

    this.addOrReplaceTXT(txt);

    const res = resource.Resource.fromJSON({
      records: [
        {
          type: 'TXT',
          txt
        }
      ]
    });
    return res.encode().toString('hex');
  }

  addTXT(array) {
    assert(Array.isArray(array));

    for (const string of array) {
      if (typeof string !== 'string')
        throw new Error('TXT must be an array of strings');
    }

    this.resource.records.push({
      type: 'TXT',
      txt: array
    });
    return this.resource;
  }

  addOrReplaceTXT(array) {
    assert(Array.isArray(array));

    for (const string of array) {
      if (typeof string !== 'string')
        throw new Error('TXT must be an array of strings');
    }

    const id = array[0];
    const newTXT = {
      type: 'TXT',
      txt: array
    };

    for (let i = 0; i < this.resource.records.length; i++) {
      const rec = this.resource.records[i];
      if (rec.type !== 'TXT')
        continue;

      if (rec.txt[0] === id) {
        // Replace / update
        this.resource.records[i] = newTXT;
        return this.resource;
      }
    }

    this.resource.records.push(newTXT);
    return this.resource;
  }

  createUpdateFromCoinJSON(json) {
    assert(json.address === this.address);
    const coin = Coin.fromJSON(json);

    const mtx = new MTX();
    mtx.addCoin(coin);

    const data = resource.Resource.fromJSON(this.resource);

    const output = new Output();
    output.fromJSON({
      value: json.value,
      address: json.address,
      covenant: {
        type: 7, // UPDATE
        items: [
          json.covenant.items[0], // namehash
          json.covenant.items[1], // height
          data.encode().toString('hex')
        ]
      }
    });
    mtx.outputs.push(output);

    mtx.sign(this.ring, 0x83); // SIGHASH_SINGLE + SIGHASH_ANYONECANPAY

    return mtx;
  }

  static async fromHNSResourceJSON(resource, passphrase, main, backend) {
    for (const rec of resource.records) {
      if (rec.type !== 'TXT')
        continue;

      if (rec.txt[0] !== 'pinkie')
        continue;

      const obj = {
        iv: Buffer.from(rec.txt[1], 'base64'),
        cipher: Buffer.from(rec.txt[2], 'base64')
      };
      const wallet = await this.fromEncryptedPhrase(
        obj,
        passphrase,
        main,
        backend
      );
      wallet.resource = resource;
      return wallet;
    }

    throw new Error('pinkie data not found in HNS resource');
  }

  static async fromEncryptedPhrase(obj, passphrase, main = false, backend) {
    const pbkey = await backend.pbkdf2.derive(
      backend.sha256,
      passphrase,
      SALT,
      ITERATIONS,
      32
    );
    const {iv, cipher} = obj;
    const phrase = await backend.aes.decipher(cipher, pbkey, iv);

    return new this(phrase.toString('ascii'), main, backend);
  }

  static fromPhrase(phrase, main = false, backend) {
    return new this(phrase, main, backend);
  }

  static generate(main = false, backend) {
    const mnemonic = new hd.Mnemonic();
    return new this(mnemonic.toString(), main, backend);
  }
}

module.exports = HNSWallet;
