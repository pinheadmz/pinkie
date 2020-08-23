'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const Path = require('path');
const {NodeClient, WalletClient} = require('hsd/node_modules/hs-client');
const {Network} = require('hsd');

const network = Network.get('regtest');

class Webserver {
  constructor() {
    // TESTING
    this.server = bweb.server({
      host: '0.0.0.0',
      port: 8080,
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

    // this.server.get('/', async (req, res) => {
    //   const uri = req.headers.host;
    //   const labels = uri.split('.');
    //   if (labels[labels.length - 1] === '')
    //     labels.pop();
    //   if (labels.length > 2) {
    //     res.send(404);
    //     return null;
    //   }

    //   const name = labels[0];
    //   if (labels.length === 1) {
    //     const history = await this.db.getHistory();
    //     const index = new Index(this.domain, history);
    //     const data = index.render();

    //     res.send(200, data);
    //     this.logger.debug(`${req.socket.remoteAddress} req: /index`);
    //     return null;
    //   } else {
    //     return this.sendProfile(req, res, name);
    //   }
    // });

    // this.server.post('/register', async (req, res) => {
    //   if (!req.hasBody) {
    //     res.send(400, 'Missing body');
    //     return;
    //   }

    //   const body = req.body;
    //   if (!body.subdomain || !body.password) {
    //     res.send(400, 'Missing required fields');
    //     return;
    //   }

    //   const subdomain = body.subdomain;
    //   const password = body.password;
    //   if (!this.verifyName(subdomain)) {
    //     res.send(400, 'Invalid subdomain');
    //     return;
    //   }
    //   if (password.length < 8) {
    //     res.send(400, 'Bad password');
    //     return;
    //   }

    //   if (await this.db.exists(subdomain)) {
    //     const sorry =
    //       'Subdomain already registered!<br>' +
    //       'If this is your subdomain,<br>' +
    //       'you can update your status at:<br>' +
    //       `<a href="https://${subdomain}.${this.domain}/edit">` +
    //         `https://${subdomain}.${this.domain}/edit` +
    //       '</a>';
    //     res.send(400, sorry);
    //     return;
    //   }

    //   await this.db.setPW(subdomain, password);
    //   const hooray =
    //     'Welcome to Proof Of Concept!<br>' +
    //     'Update your status now:<br>' +
    //     `<a href="https://${subdomain}.${this.domain}/edit">` +
    //       `https://${subdomain}.${this.domain}/edit` +
    //     '</a>';
    //   res.send(200, hooray);
    // });

    // this.server.post('/update', async (req, res) => {
    //   if (!req.hasBody) {
    //     res.send(400, 'Missing body');
    //     return;
    //   }

    //   const body = req.body;
    //   if (!body.password) {
    //     res.send(400, 'Missing password');
    //     return;
    //   }

    //   const uri = req.headers.host;
    //   const labels = uri.split('.');
    //   const subdomain = labels[0];

    //   if (labels.length === 1 || labels.length > 2) {
    //     res.send(404);
    //     return;
    //   }

    //   const status = body.status;
    //   const password = body.password;
    //   if (password.length < 8) {
    //     res.send(400, 'Bad password');
    //     return;
    //   }

    //   if (!await this.db.exists(subdomain)) {
    //     res.send(404);
    //     return;
    //   }

    //   if (!await this.db.checkPW(subdomain, password)) {
    //     res.send(400, 'Inccorect password.');
    //     return;
    //   }

    //   await this.db.setStatus(subdomain, status);
    //   const hooray =
    //     'Status update success!<br>' +
    //     'View your subdomain now:<br>' +
    //     `<a href="https://${subdomain}.${this.domain}/">` +
    //       `https://${subdomain}.${this.domain}/` +
    //     '</a>';
    //   res.send(200, hooray);
    // });

    this.server.get('/getinfo', async (req, res) => {
      try {
        const info = await this.node.getInfo();
        res.json(200, info);
      } catch (e) {
        console.log(e);
        res.json(500);
      }
      console.log(`${req.socket.remoteAddress} getinfo`);
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
