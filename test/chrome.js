const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const puppeteer = require('puppeteer');

const readFile = util.promisify(fs.readFile);

describe('chrome.js', function() {
  let browser;

  // NOTE: start assets-proxy via spawn, because hoxy has bug
  // see:
  //   - https://github.com/greim/hoxy/issues/88
  //   - https://github.com/greim/hoxy/issues/105
  const assetsProxyPath = path.resolve(__dirname, '../bin/assets-proxy.js');
  const documentRoot = path.resolve(__dirname, 'files');

  before(async function() {
    const pacPath = path.resolve(__dirname, 'chrome.pac');

    browser = await puppeteer.launch({
      args: [
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--lang=en-US,en',
        '--no-sandbox',
        `--proxy-pac-url=file://${pacPath}`
      ],
      // NOTE: it option needs if use --proxy-pac-url
      headless: false
    });
  });

  after(async function() {
    await browser.close();
  });

  it('should be replace JSON in http://httpbin.org', async function() {
    const subprocess = spawn(assetsProxyPath, [
      '--document-root',
      documentRoot,
      '--port',
      8087
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

      const page = await browser.newPage();

      await page.setRequestInterception(true);

      page.on('request', function(interceptedRequest) {
        const url = interceptedRequest.url();

        if (url.endsWith('/') || url.endsWith('spec.json')) {
          interceptedRequest.continue();
        } else {
          interceptedRequest.abort();
        }
      });

      /* await */ page.goto('http://httpbin.org');

      const res = await page.waitForResponse('http://httpbin.org/spec.json');
      const responseText = await res.text();

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
      8088,
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

      const page = await browser.newPage();

      await page.setRequestInterception(true);

      page.on('request', function(interceptedRequest) {
        const url = interceptedRequest.url();

        if (url.endsWith('/') || url.endsWith('spec.json')) {
          interceptedRequest.continue();
        } else {
          interceptedRequest.abort();
        }
      });

      /* await */ page.goto('https://httpbin.org');

      const res = await page.waitForResponse('https://httpbin.org/spec.json');
      const responseText = await res.text();

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
