module.exports = {
  opts: {
    destination: './docs/jsdoc',
    private: true,
    readme: './README.md',
    recurse: true,
    template: './node_modules/minami'
  },
  source: {
    excludePattern: 'node_modules/',
    include: ['.', './bin'],
    includePattern: '\\.js$'
  }
};
