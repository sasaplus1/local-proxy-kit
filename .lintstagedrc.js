module.exports = {
  linters: {
    '*.js': 'npx --no-install eslint',
    'package.json': ['npm run fixpack', 'git diff --exit-code --quiet']
  }
};
