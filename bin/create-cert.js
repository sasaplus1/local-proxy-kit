#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { Command } = require('commander');
const cosmiconfig = require('cosmiconfig');
const debug = require('debug');

const camelCase = require('lodash.camelcase');
const find = require('lodash.find');
const pickBy = require('lodash.pickby');

const { createCertificate, getCertificateOptions } = require('../index.js');

const meta = require('../package.json');

const scriptName = path.basename(__filename, '.js');
const commander = new Command(scriptName);

const configName = scriptName.replace(/[_-]+/g, '').toLowerCase();
const explorer = cosmiconfig(configName);

const log = debug(scriptName);

const { attributes: attributeOptions } = getCertificateOptions();

const subjectAltNames = [];

commander
  .description('create certificate and private key')
  .option('-c, --config <file>', 'configuration file')
  .option(
    '--common-name <string>',
    'common name',
    find(attributeOptions, { shortName: 'CN' }).value
  )
  .option(
    '--country <string>',
    'country name',
    find(attributeOptions, { shortName: 'C' }).value
  )
  .option(
    '--locality-name <string>',
    'locality name',
    find(attributeOptions, { shortName: 'L' }).value
  )
  .option(
    '--organization-name <string>',
    'organization name',
    find(attributeOptions, { shortName: 'O' }).value
  )
  .option('--organizational-unit-name <string>', 'organizational unit name')
  .option(
    '--output-cert <path>',
    'output private cert file path',
    path.resolve(process.cwd(), 'assets-proxy-ca.crt.pem')
  )
  .option(
    '--output-key <path>',
    'output private key file path',
    path.resolve(process.cwd(), 'assets-proxy-ca.key.pem')
  )
  .option(
    '--state-or-province-name <string>',
    'state or province name',
    find(attributeOptions, { shortName: 'ST' }).value
  )
  .option('--subject-alt-name <string>', 'subject alt name', function(s) {
    subjectAltNames.push(s);
  })
  .version(meta.version, '-v, --version')
  .parse(process.argv);

const { config } = commander;

// NOTE: read file if passed --config, otherwise search config file.
const searchResult = config ? explorer.loadSync(config) : explorer.searchSync();

const rc = searchResult ? searchResult.config : {};

log('rc: %O', rc);

// NOTE: get long option names
const optionKeys = commander.options.map(option => camelCase(option.long));

// NOTE: get option values
const switches = pickBy(
  commander,
  (value, key) => key !== 'version' && optionKeys.includes(key)
);

const options = Object.assign({}, rc, switches);

log('options: %O', options);

const {
  commonName,
  country,
  localityName,
  organizationName,
  organizationalUnitName,
  outputCert,
  outputKey,
  stateOrProvinceName
} = options;

const certificateOptions = getCertificateOptions({
  attributes: {
    CN: commonName,
    C: country,
    ST: stateOrProvinceName,
    L: localityName,
    O: organizationName,
    OU: organizationalUnitName
  },
  subjectAltName: subjectAltNames
});

const { certificate, serviceKey } = createCertificate(certificateOptions);

fs.writeFileSync(outputCert, certificate, 'utf8');
fs.writeFileSync(outputKey, serviceKey, 'utf8');

// NOTE: need process.kill, because hoxy has bug
// see:
//   - https://github.com/greim/hoxy/issues/88
//   - https://github.com/greim/hoxy/issues/105
process.stdout.write(
  [
    'need process.kill, because hoxy has bug',
    'see:',
    '  - https://github.com/greim/hoxy/issues/88',
    '  - https://github.com/greim/hoxy/issues/105'
  ].join('\n') + '\n'
);
process.kill(process.pid);
