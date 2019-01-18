const fs = require('fs');
const path = require('path');
const util = require('util');

const hoxy = require('hoxy');
const pem = require('pem');

const pickBy = require('lodash.pickby');

const meta = require('./package.json');

const createCertificate = util.promisify(pem.createCertificate);

const moduleName = path.basename(meta.name);

/**
 * create certificate
 *
 * @param {Object} [options={}]
 * @return {Promise}
 * @see http://greim.github.io/hoxy/#intercept-https
 * @see https://www.deineagentur.com/projects/pem/module-pem.html#.createCertificate
 */
async function createCocProxyCertificate(options = {}) {
  // NOTE: default value get from http://greim.github.io/hoxy/#intercept-https
  // NOTE: https://www.deineagentur.com/projects/pem/module-pem.html#.createCertificate
  const certificateOptions = Object.assign(
    {
      // NOTE: commonName defaults to 'localhost'
      // commonName: 'example.com',
      country: 'US',
      days: 1024,
      locality: 'Provo',
      organization: 'ACME Signing Authority Inc',
      selfSigned: true,
      state: 'Utah'
    },
    options
  );

  return await createCertificate.call(pem, certificateOptions);
}

/**
 * create proxy server
 *
 * @param {Object} [options={}]
 * @param {string} [options.cert='']
 * @param {boolean} [options.https=false]
 * @param {string} [options.key='']
 * @return {Promise}
 */
async function createProxyServer(options = {}) {
  const { cert = '', https = false, key = '', ...spreadOptions } = options;

  const certificateOptions = {};

  if (cert && key) {
    Object.assign(certificateOptions, {
      cert: fs.readFileSync(cert),
      key: fs.readFileSync(key)
    });
  } else if (https) {
    const { certificate, serviceKey } = await createCocProxyCertificate();

    Object.assign(certificateOptions, {
      cert: certificate,
      key: serviceKey
    });
  }

  const serverOptions = Object.assign(
    {
      certAuthority: certificateOptions
    },
    spreadOptions
  );

  return hoxy.createServer(serverOptions);
}

/**
 * get replace handler for hoxy intercept
 *
 * @param {string} documentRoot
 * @return {Function}
 * @see http://greim.github.io/hoxy/#proxy-intercept
 */
function getReplaceHandler(documentRoot) {
  return function replaceHandler(req, resp, cycle) {
    return cycle.serve({
      docroot: path.resolve(documentRoot, req.hostname),
      strategy: 'overlay'
    });
  };
}

/**
 * run CocProxy
 *
 * @param {Object} [options={}]
 * @param {Object} [options.cert]
 * @param {string} [options.documentRoot]
 * @param {Object} [options.filter]
 * @param {boolean} [options.https]
 * @param {string} [options.key]
 * @param {number} [options.port]
 * @return {Promise}
 */
async function runCocProxy(options = {}) {
  const { cert, documentRoot, filter, https, key, port } = options;

  const proxy = await createProxyServer({ cert, https, key });

  const replaceHandler = getReplaceHandler(documentRoot);

  // NOTE: filter out `as`
  const filters = pickBy(filter, (value, key) => key !== 'as');
  const filterOptions = Object.assign({}, filters, {
    phase: 'request'
  });

  proxy.intercept(filterOptions, function(req, resp, cycle) {
    process.stdout.write('request: ' + req.fullUrl() + '\n');

    return replaceHandler(req, resp, cycle);
  });

  proxy.log('error warn', function(event) {
    const { error, level, message } = event;

    process.stderr.write(`${level}: ${message}`);

    if (error) {
      process.stderr.write(error.stack);
    }
  });

  proxy.listen(port, function() {
    process.stdout.write(`starting ${moduleName} at ${port}\n`);
  });

  return proxy;
}

module.exports = {
  createCocProxyCertificate,
  createProxyServer,
  getReplaceHandler,
  runCocProxy
};
