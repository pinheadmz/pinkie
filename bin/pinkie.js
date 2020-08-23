'use strict';

const Webserver = require('../lib/webserver');

(async () => {
  const webserver = new Webserver();
  webserver.init();
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
