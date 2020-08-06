'use strict';

const assert = require('assert');
const {NodeClient, WalletClient} = require('hs-client');
const {FullNode, Network, Output, Coin, TX} = require('hsd');
const network = Network.get('regtest');

const HNSWallet = require('../lib/hns-wallet');

const nodeOptions = {
  network: network.type,
  port: network.rpcPort
};

const walletOptions = {
  network: network.type,
  port: network.walletPort
};

const node = new FullNode({
  network: 'regtest',
  memory: true,
  plugins: [require('hsd/lib/wallet/plugin')]
});
const nodeClient = new NodeClient(nodeOptions);
const walletClient = new WalletClient(walletOptions);

const name = 'test1';

(async () => {
  // Start node, aquire name
  await node.open();
  await nodeClient.open();
  await walletClient.open();

  console.log('Funding wallet...');
  const addr = await walletClient.execute('getnewaddress', []);
  await nodeClient.execute('generatetoaddress', [100, addr]);

  console.log('Opening auction...');
  await walletClient.execute('sendopen', [name]);
  await nodeClient.execute('generatetoaddress', [7, addr]);

  console.log('Bidding...');
  await walletClient.execute('sendbid', [name, 0, 0]);
  await nodeClient.execute('generatetoaddress', [7, addr]);

  console.log('Revealing...');
  await walletClient.execute('sendreveal', []);
  await nodeClient.execute('generatetoaddress', [10, addr]);

  console.log('Registering...');
  await walletClient.execute('sendupdate', [name, {'records':[]}]);
  await nodeClient.execute('generatetoaddress', [10, addr]);

  // Generate wallet and receive name
  const mainnet = false;
  const wallet = HNSWallet.generate(mainnet);
  const receive = wallet.address.toString(wallet.network);
  console.log('Receive Address:\n', addr);

  console.log('Transferring...');
  await walletClient.execute('sendtransfer', [name, receive]);
  await nodeClient.execute('generatetoaddress', [10, addr]);

  console.log('Finalizing...');
  await walletClient.execute('sendfinalize', [name]);
  await nodeClient.execute('generatetoaddress', [10, addr]);

  // Get name-owning coin
  const info = await nodeClient.execute('getnameinfo', [name]);
  console.log('Name info:\n', info);

  const owner = await nodeClient.getCoin(
    info.info.owner.hash,
    info.info.owner.index
  );
  console.log('Coin:\n', owner);

  // Update TXT - SIGHASH_SINGLE
  const expected = [
    'sia',
    'IAC6CkhNYuWZqMVr1gob1B6tPg4MrBGRzTaDvAIAeu9A9w'
  ];
  wallet.addOrReplaceTXT(expected);
  const mtx = wallet.createUpdateFromCoinJSON(owner);
  console.log('SIGHASH_SINGLE MTX:\n', mtx);

  // Add funds from server's wallet
  const coins = await walletClient.execute('listunspent', []);
  let fundingCoinJSON;
  while (coins.length > 0) {
    const funds = coins.pop();
    fundingCoinJSON = await nodeClient.getCoin(
      funds.txid,
      funds.vout
    );
    if (!fundingCoinJSON.coinbase)
      break;
  }

  const fundingCoin = Coin.fromJSON(fundingCoinJSON);
  console.log('Funding coin:\n', fundingCoinJSON);

  // Check coin value here, maybe lock coin and check other locks.

  const change = await walletClient.execute('getrawchangeaddress', []);
  mtx.addCoin(fundingCoin);
  const output = new Output();
  output.fromJSON({
    value: fundingCoinJSON.value,
    address: change
  });
  mtx.outputs.push(output);
  console.log('Funded MTX:\n', mtx);

  // Subtract fee -- could be smarter in the future when fee pressure exists
  const vsize = mtx.getVirtualSize();
  const kb = vsize/1000;
  const fee = parseInt(kb * 100000);
  mtx.outputs[1].value -= fee;
  console.log('Funded MTX minus fee:\n', mtx);

  // Sign the only input that we can sign
  const priv = await walletClient.execute(
    'dumpprivkey',
    [fundingCoinJSON.address]
  );

  const signed = await nodeClient.execute(
    'signrawtransaction',
    [
      mtx.toHex(),
      [
        {
          txid: owner.hash,
          vout: owner.index,
          address: owner.address,
          amount: owner.value / 1e6
        },
        {
          txid: fundingCoinJSON.hash,
          vout: fundingCoinJSON.index,
          address: fundingCoinJSON.address,
          amount: fundingCoinJSON.value / 1e6
        }
      ],
      [priv]
    ]
  );
  console.log(
    'Signed TX:\n',
    signed,
    TX.decode(Buffer.from(signed.hex, 'hex'))
  );
  assert(signed.complete);

  // Broadcast
  const broadcast = await nodeClient.broadcast(signed.hex);
  assert(broadcast.success);

  // Confirm and check
  await nodeClient.execute('generatetoaddress', [1, addr]);
  const resource = await nodeClient.execute('getnameresource', [name]);
  console.log('Resource:\n', resource);

  assert.deepStrictEqual(wallet.resource, resource);

  // Close
  await nodeClient.close();
  await walletClient.close();
  await node.close();
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
