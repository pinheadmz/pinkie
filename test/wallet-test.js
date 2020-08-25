'use strict';

const assert = require('assert');
const {resource, Coin, CoinView} = require('hsd');

const HNSWallet = require('../lib/hns-wallet');
const backend = require('../lib/crypto-node.js');

// Entered by user
const password = 'correcthorsebatterystaple';

// Returned from server
const coin = {
  version: 0,
  height: 1000,
  value: 0,
  address: '<placeholder>',
  covenant: {
    type: 10,
    action: 'FINALIZE',
    items: [
      'd961dcb58511997dd253661a1b4de22be1bd92071a507152194f742ff008ffbf',
      'a6330000',
      '6d616e6f735f5f7468655f68616e64735f6f665f66617465',
      '00',
      '00000000',
      '02000000',
      '00000000000000e32502495ef20a3f485aa5786c9637766df60bfee9ce487c2f'
    ]
  },
  coinbase: false,
  hash: 'ef698c8798236acf4a90a08591369f5b0aaaf16b54bc8c6082bd73cd6fb2d4e8',
  index: 0
};

// Create wallet and inspect properties
const mainnet = false;
const wallet = HNSWallet.generate(mainnet, backend);

const phrase = wallet.phrase;
console.log('Wallet Phrase:\n', phrase);

const masterPriv = wallet.master.getJSON(wallet.network);
console.log('Master Private Key:\n', masterPriv);

const accountPriv = wallet.account.getJSON(wallet.network);
console.log('Account Private Key:\n', accountPriv);

const addrPriv = wallet.receive.getJSON(wallet.network);
console.log('Receive Address Private Key:\n', addrPriv);

const keyRing = wallet.ring.getJSON(wallet.network);
console.log('Receive Address KeyRing:\n', keyRing);

const addr = wallet.address.toString(wallet.network);
console.log('Receive Address:\n', addr);

// Pretend like we are already the name owner
coin.address = addr;

(async () => {
  // Encrypt wallet seed phrase with password
  const obj = await wallet.encryptSeed(password);
  console.log('Encrypted Seed:\n', obj);

  // Decrypt seed with password and create wallet
  const wallet2 = await HNSWallet.fromEncryptedPhrase(
    obj,
    password,
    mainnet,
    backend
  );
  console.log('Wallet From Encrypted Phrase:\n', wallet2);

  // Check
  assert.strictEqual(wallet.phrase, wallet2.phrase);
  assert.strictEqual(
    wallet.address.toString(wallet.network),
    wallet2.address.toString(wallet2.network)
  );

  // Create HNS resource blob with "pinkie" TXT record
  // (namebase "Blockchain DNS advanced settings" format)
  const res = await wallet.getEncryptedSeedResource(password);
  console.log('Encrypted Seed HNS Resource hex:\n', res);

  // Decode HNS resource back into JSON
  const json = resource.Resource.decode(Buffer.from(res, 'hex')).toJSON();
  console.log('Encrypted Seed HNS Resource json:\n');
  console.dir(json, {depth: null});

  // Create wallet from resource JSON
  const wallet3 = await HNSWallet.fromHNSResourceJSON(
    json,
    password,
    mainnet,
    backend
  );
  console.log('Wallet from HNS Resource json:\n', wallet3);

  // Check
  assert.strictEqual(wallet.phrase, wallet3.phrase);
  assert.strictEqual(
    wallet.address.toString(wallet.network),
    wallet3.address.toString(wallet3.network)
  );

  // Add TXT
  const res2 = wallet3.updateSkylink(
    'sia://1111116CkhNYuWZqMVr1gob1B6tPg4MrBGRzTaDvAIAeu9A9w'
  );
  assert(wallet3.resource.records.length === 2);
  console.dir(res2, {depth: null});

  // Update TXT
  const res3 = wallet3.updateSkylink(
    'sia://222222qp524qMH5wD5rzuGxYmwm64Sko1GR7tQ4Sas9q3gg'
  );
  assert(wallet3.resource.records.length === 2);
  console.dir(res3, {depth: null});

  // Sign SIGHASH_SINGLE and verify
  const mtx = wallet3.createUpdateFromCoinJSON(coin);
  console.log(mtx);
  mtx.check();
  const view = new CoinView();
  view.addCoin(Coin.fromJSON(coin));
  const tx = mtx.toTX();
  assert(tx.verify(view));

  console.log('Raw TX:\n', tx.toHex());
})();
