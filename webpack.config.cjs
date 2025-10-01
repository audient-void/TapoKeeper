const path = require('path');

module.exports = {
  entry: './index.js',
  target: 'node',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'tapokeeper.cjs',
    module: false,
  },
  externals: {
    'local-devices': 'commonjs2 local-devices'
  },
  experiments: {
    outputModule: false,
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: ['.js', '.json'],
    fullySpecified: false,
  },
};
