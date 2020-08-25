'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const Path = require('path');
const {NodeClient, WalletClient} = require('hsd/node_modules/hs-client');
const {Network, MTX, Coin, Output} = require('hsd');

const network = Network.get('regtest');

class Webserver {
  constructor() {
    // TESTING
    this.server = bweb.server({
      host: '0.0.0.0',
      port: 8000,
      sockets: false,
      ssl: false
    });

    this.node = new NodeClient({
      network: network.type,
      port: network.rpcPort
    });

    this.wallet = new WalletClient({
      network: network.type,
      port: network.walletPort
    });

    // SSL
    // this.server = bweb.server({
    //   host: '0.0.0.0',
    //   port: 443,
    //   sockets: false,
    //   ssl: true,
    //   keyFile:
    //     Path.join(__dirname, '..', `pinkie.key`),
    //   certFile:
    //     Path.join(__dirname, '..', 'conf', 'ssl', `pinkie.crt`)
    // });
  }

  async init() {
    this.server.use(this.server.bodyParser({type: 'form'}));
    this.server.use(this.server.router());

    this.server.on('error', (err) => {
      console.error('Server error:', err.stack);
    });

    this.server.get('/nameinfo', async (req, res) => {
      console.log(`${req.socket.remoteAddress} nameinfo`);

      if (!req.query.name) {
        res.send(400, 'Missing name');
        return;
      }
      const name = req.query.name;

      try {
        const info = await this.node.execute('getnameinfo', [name]);
        if (!info) {
          res.json(500);
          throw new Error(`No name info for ${name}`);
        }

        const owner = await this.node.getCoin(
          info.info.owner.hash,
          info.info.owner.index
        );
        if (!owner) {
          res.json(500);
          throw new Error(`Could not find owner for ${name}`);
        }

        res.json(200, owner);
      } catch (e) {
        console.log(e);
        res.json(500);
        return;
      }
    });

    this.server.get('/nameresource', async (req, res) => {
      console.log(`${req.socket.remoteAddress} nameresource`);

      if (!req.query.name) {
        res.send(400, 'Missing name');
        return;
      }
      const name = req.query.name;

      try {
        const resource = await this.node.execute('getnameresource', [name]);
        if (!resource) {
          res.json(500);
          throw new Error(`No name resource for ${name}`);
        }

        res.json(200, resource);
      } catch (e) {
        console.log(e);
        res.json(500);
        return;
      }
    });

    this.server.post('/update', async (req, res) => {
      console.log(`${req.socket.remoteAddress} update`);
      if (!req.hasBody) {
        res.send(400, 'Missing body');
        return;
      }

      const body = req.body;
      if (!body.tx) {
        res.send(400, 'Missing transaction');
        return;
      }
      if (!body.name) {
        res.send(400, 'Missing name');
        return;
      }

      const tx = body.tx;
      const name = body.name;
      console.log(name, tx);

      try {
        // Throws if serialized mtx is malformed
        const mtx = MTX.decode(Buffer.from(tx, 'hex'));

        const info = await this.node.execute('getnameinfo', [name]);
        if (!info) {
          res.json(500);
          throw new Error(`No name info for ${name}`);
        }

        const owner = await this.node.getCoin(
          info.info.owner.hash,
          info.info.owner.index
        );
        if (!owner) {
          res.json(500);
          throw new Error(`Could not find owner for ${name}`);
        }

        // Add funds from server's wallet
        const coins = await this.wallet.execute('listunspent', []);
        let fundingCoinJSON;
        while (coins.length > 0) {
          const funds = coins.pop();
          // Maybe not necessary if coin from wallet has enough data
          fundingCoinJSON = await this.node.getCoin(
            funds.txid,
            funds.vout
          );
          // Ignore coinbase coins on regtest to avoid maturity error
          if (!fundingCoinJSON.coinbase)
            break;
        }

        const fundingCoin = Coin.fromJSON(fundingCoinJSON);

        // Check coin value here, maybe lock coin and check other locks.

        const change = await this.wallet.execute('getrawchangeaddress', []);
        mtx.addCoin(fundingCoin);
        const output = new Output();
        output.fromJSON({
          value: fundingCoinJSON.value,
          address: change
        });
        mtx.outputs.push(output);

        // Subtract fee. Could be smarter in the future when fee pressure exists
        const vsize = mtx.getVirtualSize();
        const kb = Math.ceil(vsize / 1000);
        const fee = parseInt(kb * 100000);
        mtx.outputs[1].value -= fee;

        // Sign the only input that we can sign
        const priv = await this.wallet.execute(
          'dumpprivkey',
          [fundingCoinJSON.address]
        );

        const signed = await this.node.execute(
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

        if(!signed.complete) {
          res.json(500);
          throw new Error('Could not complete signing tx');
        }

        // Broadcast
        const broadcast = await this.node.broadcast(signed.hex);
        if(!broadcast.success) {
          res.json(500);
          throw new Error('Could not broadcast tx');
        }
      } catch (e) {
        console.log(e);
        res.json(500);
        return;
      }

      res.json(200, {success: true});
    });

    this.server.get('/getinfo', async (req, res) => {
      console.log(`${req.socket.remoteAddress} getinfo`);
      try {
        const info = await this.node.getInfo();
        res.json(200, info);
      } catch (e) {
        console.log(e);
        res.json(500);
      }
    });

    this.server.get('/', (req, res) => {
      this.sendFile(req, res, 'index.html');
    });

    this.server.get('/:href(*)', (req, res) => {
      this.sendFile(req, res, req.url);
    });

    // REDIRECT TO SSL
    // const redirect = bweb.server({
    //   host: '0.0.0.0',
    //   port: 80,
    //   sockets: false,
    //   ssl: false
    // });

    // redirect.use(redirect.router());
    // redirect.get('*', (req, res) => {
    //   res.redirect(`https://${this.domain}/`);
    // });
    // redirect.on('error', (err) => {
    //   console.error('Redirect error:', err.stack);
    // });
    // redirect.open();

    this.server.open();
    console.log('Webserver opened');
  }

  sendFile(req, res, file) {
    const location = Path.join(__dirname, '..', 'html', file);
    let data = null;
    let code = 500;
    try {
      data = fs.readFileSync(location);
      code = 200;
    } catch (e) {
      code = 404;
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(code, data);
    console.log(`${req.socket.remoteAddress} req: ${file} (${code})`);
  }
}

/*
 * Expose
 */

module.exports = Webserver;
