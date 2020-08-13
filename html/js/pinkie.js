/* eslint-env browser */
'use strict';

let wallet;


// Returned from server
const testcoin = {
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

function generate() {
  wallet = HNSWallet.generate(true, browserCrypto);

  let phrase = wallet.phrase;
  phrase = phrase.split(' ');
  phrase[11] += "<br>";
  phrase = phrase.join(' ');
  document.getElementById('phrase').innerHTML = phrase;
  document.getElementById('address').innerHTML = wallet.address;
}

async function encrypt() {
  if (!wallet) {
    alert('You must generate first!');
    return;
  }

  const passphrase = document.getElementById('passphrase').value;

  if (passphrase.length < 20) {
    alert('Paspshrase must be at least 20 characters long');
    return;
  }

  document.getElementById('hex').innerHTML = 'Encrypting...';
  document.getElementById('json').innerHTML = 'Encrypting...';

  const hex = await wallet.getEncryptedSeedResource(passphrase);
  document.getElementById('hex').innerHTML = hex;
  document.getElementById('json').innerHTML =
    JSON.stringify(wallet.resource, null, 2);
}

async function update() {
  const link = document.getElementById('skylink').value;

  wallet.addOrReplaceTXT(['sia', link]);

  testcoin.address = wallet.address;
  const tx = wallet.createUpdateFromCoinJSON(testcoin);

  document.getElementById('txhex').innerHTML = tx.encode().toString('hex');
  document.getElementById('txjson').innerHTML =
    JSON.stringify(tx.getJSON(), null, 2);
}
