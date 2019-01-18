const fs = require('fs');
const path = require('path');

const hoxy = require('hoxy');
const forge = require('node-forge');

const pickBy = require('lodash.pickby');

const meta = require('./package.json');

const { pki } = forge;

const moduleName = path.basename(meta.name);

/**
 * create certificate
 *
 * @param {Object} [options={}]
 * @param {Object[]} [options.attributes=[]]
 * @param {Object[]} [options.extensions=[]]
 * @return {Object}
 * @see http://greim.github.io/hoxy/#intercept-https
 * @see https://github.com/digitalbazaar/forge#x509
 */
function createCertificate(options = {}) {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';

  cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + 1024);

  const { attributes = [], extensions = [] } = options;

  // NOTE: default value get from http://greim.github.io/hoxy/#intercept-https
  // NOTE: https://github.com/digitalbazaar/forge#x509
  const attributesOptions =
    attributes.length > 0
      ? attributes
      : [
          {
            shortName: 'CN',
            value: 'localhost'
          },
          {
            shortName: 'C',
            value: 'US'
          },
          {
            shortName: 'ST',
            value: 'Utah'
          },
          {
            shortName: 'L',
            value: 'Provo'
          },
          {
            shortName: 'O',
            value: 'ACME Signing Authority Inc'
          }
        ];

  cert.setSubject(attributesOptions);
  cert.setIssuer(attributesOptions);

  const extensionsOptions =
    extensions.length > 0
      ? extensions
      : [
          {
            cA: true,
            name: 'basicConstraints'
          },
          {
            cRLSign: true,
            digitalSignature: true,
            keyCertSign: true,
            name: 'keyUsage'
          },
          {
            name: 'subjectKeyIdentifier'
          },
          {
            name: 'subjectAltName',
            altNames: [
              {
                type: 2,
                value: 'localhost'
              },
              {
                type: 7,
                ip: '127.0.0.1'
              }
            ]
          }
        ];

  cert.setExtensions(extensionsOptions);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certificate: pki.certificateToPem(cert),
    serviceKey: pki.privateKeyToPem(keys.privateKey)
  };
}

/**
 * create proxy server
 *
 * @param {Object} [options={}]
 * @param {string} [options.cert='']
 * @param {boolean} [options.https=false]
 * @param {string} [options.key='']
 * @return {Proxy}
 */
function createProxyServer(options = {}) {
  const { cert = '', https = false, key = '', ...spreadOptions } = options;

  const certificateOptions = {};

  if (cert && key) {
    Object.assign(certificateOptions, {
      cert: fs.readFileSync(cert),
      key: fs.readFileSync(key)
    });
  } else if (https) {
    const { certificate, serviceKey } = createCertificate();

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
 * run AssetsProxy
 *
 * @param {Object} [options={}]
 * @param {Object} [options.cert]
 * @param {string} [options.documentRoot]
 * @param {Object} [options.filter]
 * @param {boolean} [options.https]
 * @param {string} [options.key]
 * @param {number} [options.port]
 * @return {Proxy}
 */
function runAssetsProxy(options = {}) {
  const { cert, documentRoot, filter, https, key, port } = options;

  const proxy = createProxyServer({ cert, https, key });

  const replaceHandler = getReplaceHandler(documentRoot);

  // NOTE: filter out `as`
  const filters = pickBy(filter, (value, key) => key !== 'as');
  const filterOptions = Object.assign({}, filters, {
    phase: 'request'
  });

  proxy.intercept(filterOptions, function(req, resp, cycle) {
    process.stdout.write(`request: ${req.fullUrl()}\n`);

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
  createCertificate,
  createProxyServer,
  getReplaceHandler,
  runAssetsProxy
};
