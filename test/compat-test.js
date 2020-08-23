'use strict';

const assert = require('assert');

const HNSWallet = require('../lib/hns-wallet');
const backend = require('../lib/crypto-node.js');
const mainnet = 'true';

// Entered by user
const password = 'correcthorsebatterystaple';

// Test vectors generated in browser
const testPhrase =
  'together help word must monitor ' +
  'husband jealous drive hawk pattern '+
  'over crawl scorpion destroy wait ' +
  'strike garment climb thing edge ' +
  'girl aerobic build private';

const testAddr = 'hs1qzarw5hx8gq4sla2pgfpwhtchsv84x92xwz8pfn';

const testResourceJSON =
  {
    'records': [
      {
        'type': 'TXT',
        'txt': [
          'pinkie',
          'am8a2CsGEejoaTxOzzARIA==',
          'oWXXYLFVpDJmD16YFHfosB/xP9iYxu4GuN8kksRF+QP4jwxMq4wYOM5PdQi/WDzhQ' +
          'zR7sCVb/ijg5R/32s9cGrnkf+UpdvvKjb34su5HuKKUp/VHubKHhHMepb0xzZGqd8' +
          '4GHw53fMG2Of8OrHeimn2Ce5LKD0Ry8VC4u1HlqSk44j5Hr+RAOvMNcSWq7lm0sSm' +
          'jwWfxLbecpVSH78RPTdKZ1O4pG29zG4RW+D6D'
        ]
      }
    ]
  };

(async () => {
  // Create wallet from resource JSON
  const wallet3 = await HNSWallet.fromHNSResourceJSON(
    testResourceJSON,
    password,
    mainnet,
    backend
  );
  console.log('Wallet from HNS Resource json:\n', wallet3);

  // Check
  assert.strictEqual(testPhrase, wallet3.phrase);
  assert.strictEqual(
    testAddr,
    wallet3.address.toString(wallet3.network)
  );
})();
