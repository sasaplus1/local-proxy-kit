const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const http = require('http');
const https = require('https');

const readFile = util.promisify(fs.readFile);

function request(options) {
  return new Promise(function(resolve, reject) {
    const { path: url } = options;

    (url.startsWith('https') ? https : http)
      .get(options, function(res) {
        let buffer = '';

        res.on('data', function(chunk) {
          buffer += chunk;
        });
        res.on('end', async function() {
          resolve(buffer);
        });
      })
      .on('end', reject);
  });
}

describe('fetch.js', function() {
  // NOTE: start assets-proxy via spawn, because hoxy has bug
  // see:
  //   - https://github.com/greim/hoxy/issues/88
  //   - https://github.com/greim/hoxy/issues/105
  const assetsProxyPath = path.resolve(__dirname, '../bin/assets-proxy.js');
  const documentRoot = path.resolve(__dirname, 'files');

  it('should be replace JSON in http://httpbin.org', async function() {
    const subprocess = spawn(assetsProxyPath, [
      '--document-root',
      documentRoot,
      '--port',
      8888
    ]);

    try {
      await new Promise(function(resolve) {
        subprocess.stdout.on('data', function(data) {
          const output = data.toString();

          if (/^starting/.test(output)) {
            resolve();
          }
        });
      });

      const responseText = await request({
        host: '127.0.0.1',
        path: 'http://httpbin.org/spec.json',
        port: 8888
      });

      const replaceText = await readFile(
        path.resolve(__dirname, './files/httpbin.org/spec.json'),
        'utf8'
      );

      assert(responseText === replaceText);
    } finally {
      subprocess.kill();
    }
  });
  it('should be replace JSON in https://httpbin.org', async function() {
    const subprocess = spawn(assetsProxyPath, [
      '--document-root',
      documentRoot,
      '--port',
      8889,
      '--https'
    ]);

    try {
      await new Promise(function(resolve) {
        subprocess.stdout.on('data', function(data) {
          const output = data.toString();

          if (/^starting/.test(output)) {
            resolve();
          }
        });
      });

      // const beforeNodeTlsRejectUnauthorized =
      //   process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      // process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

      const responseText = await request({
        agent: false,
        host: '127.0.0.1',
        path: 'https://httpbin.org/spec.json',
        port: 8889,
        rejectUnauthorized: false,
        requestCert: true
      });

      // process.env.NODE_TLS_REJECT_UNAUTHORIZED = beforeNodeTlsRejectUnauthorized;

      const replaceText = await readFile(
        path.resolve(__dirname, './files/httpbin.org/spec.json'),
        'utf8'
      );

      assert(responseText === replaceText);
    } finally {
      subprocess.kill();
    }
  });
});
