module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  overrides: [
    {
      env: {
        mocha: true
      },
      files: ['test/**/*.js']
    },
    {
      files: ['test/**/*.pac'],
      env: {
        browser: true,
        node: false
      },
      globals: {
        // NOTE: http://findproxyforurl.com/pac-functions/
        alert: true,
        dateRange: true,
        dnsDomainIs: true,
        dnsDomainLevels: true,
        dnsResolve: true,
        isInNet: true,
        isPlainHostName: true,
        isResolvable: true,
        localHostOrDomainIs: true,
        myIpAddress: true,
        shExpMatch: true,
        timeRange: true,
        weekdayRange: true
      },
      rules: {
        'no-unused-vars': ['error', { varsIgnorePattern: 'FindProxyForURL' }]
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 2018
  },
  root: true
};
