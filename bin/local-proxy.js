#!/usr/bin/env node

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
  .option('-c, --config <config>', 'configuration file')
  .option('-C, --cert-options <json>', 'certificate options', JSON.parse)
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
  .option('-p, --port <port>', 'port number', /^\d+/)
  .option('-s, --ssl', 'use SSL')
  .version(meta.version, '-v, --version')
  .parse(process.argv);

const { config } = commander;

// NOTE: read file if passed --config, otherwise search config file.
const searchResult = config ? explorer.loadSync(config) : explorer.searchSync();

const rc = searchResult ? searchResult.config : {};

log(rc);

// NOTE: get long option names
const optionKeys = commander.options.map(option => camelCase(option.long));

// NOTE: get option values
const switches = pickBy(commander, (value, key) => optionKeys.includes(key));

const options = Object.assign({}, rc, switches);

log(options);

const { documentRoot } = options;

if (!documentRoot) {
  commander.outputHelp();
  process.exit(1);
}
