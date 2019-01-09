module.exports = {
  '*.js': 'npm run lint',
  'package.json': ['npm run fixpack', 'git diff --exit-code --quiet']
};
