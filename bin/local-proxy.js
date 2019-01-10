#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { Command } = require('commander');
const cosmiconfig = require('cosmiconfig');
const debug = require('debug');

const camelCase = require('lodash.camelcase');
const pickBy = require('lodash.pickby');

const meta = require('../package.json');

const scriptName = path.basename(__filename, '.js');
const commander = new Command(scriptName);

const configName = scriptName.replace(/[_-]+/g, '').toLowerCase();
const explorer = cosmiconfig(configName);

const log = debug(scriptName);

commander
  .description('start Local Proxy server')
  .option('-c, --config <file>', 'configuration file')
  .option('-C, --cert <file>', 'certificate file')
  .option(
    '-d, --document-root <dir>',
    'document root directory',
    path.resolve(process.cwd(), 'files')
  )
  .option(
    '-f, --filter <json>',
    'filter configuration for interceptor',
    JSON.parse
  )
  .option('-k, --key <file>', 'key file')
  .option('-p, --port <number>', 'port number', /^\d+$/, 8087)
  .option('-s, --https', 'use HTTPS')
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
const switches = pickBy(commander, (value, key) => optionKeys.includes(key));

const options = Object.assign({}, rc, switches);

log('options: %O', options);

const { documentRoot } = options;

if (!fs.existsSync(documentRoot)) {
  commander.outputHelp();
  process.exit(1);
}
