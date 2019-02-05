#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { Command } = require('commander');
const cosmiconfig = require('cosmiconfig');
const debug = require('debug');
const camelCase = require('lodash.camelcase');
const pickBy = require('lodash.pickby');
const notifier = require('node-notifier');

const { runAssetsProxy } = require('../index.js');

const meta = require('../package.json');

const scriptName = path.basename(__filename, '.js');
const commander = new Command(scriptName);

const configName = scriptName.replace(/[_-]+/g, '').toLowerCase();
const explorer = cosmiconfig(configName);

const log = debug(scriptName);

commander
  .description('start assets proxy server')
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
  .option('-n, --notify', 'notify error')
  .option('-p, --port <number>', 'port number', /^\d+$/, 8087)
  .option('-s, --https', 'use HTTPS, cert and key are create on the fly')
  .version(meta.version, '-v, --version')
  .parse(process.argv);

const { config } = commander;

// NOTE: read file if passed --config, otherwise search config file.
const searchResult = config ? explorer.loadSync(config) : explorer.searchSync();

const rc = searchResult ? searchResult.config : {};

log('rc: %O', rc);

const defaultValues = commander.options
  .filter(option => typeof option.defaultValue !== 'undefined')
  .reduce(function(acc, option) {
    const { defaultValue, long } = option;

    return Object.assign(acc, {
      [camelCase(long)]: defaultValue
    });
  }, {});

log('defaultValues: %O', defaultValues);

// NOTE: get long option names
const optionKeys = commander.options.map(option => camelCase(option.long));

log('optionKeys: %O', optionKeys);

// NOTE: get option values
const switches = pickBy(
  commander,
  (value, key) =>
    key !== 'version' &&
    optionKeys.includes(key) &&
    value !== defaultValues[key]
);

log('switches: %O', switches);

const options = Object.assign({}, defaultValues, rc, switches);

log('options: %O', options);

const { documentRoot, notify: isNotify } = options;

if (!fs.existsSync(documentRoot)) {
  commander.outputHelp();
  process.exit(1);
}

const proxy = runAssetsProxy(options);

proxy.log('error warn', function(event) {
  const { error, level, message } = event;

  if (isNotify) {
    notifier.notify({
      title: scriptName,
      message,
      sound: true,
      wait: false
    });
  }

  process.stderr.write(`${level}: ${message}`);

  if (error) {
    process.stderr.write(error.stack);
  }
});
