/* eslint-env browser */
'use strict';

let wallet;

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








// (async () => {
//   const w = HNSWallet.generate(true, browserCrypto);
//   console.log('wallet:', w);
//   const res = await w.getEncryptedSeedResource(prompt('Enter password:'));
//   console.log('resource hex:', res);
// })();