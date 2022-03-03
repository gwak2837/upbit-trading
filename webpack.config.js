/* eslint-disable node/no-unpublished-require */
/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve } = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const { NODE_ENV } = process.env

module.exports = {
  entry: NODE_ENV !== 'none' ? './src/index.ts' : './test/index.ts',
  mode: NODE_ENV,
  module: {
    rules: [
      {
        include: resolve(__dirname, 'src'),
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  output: {
    clean: true,
    filename: 'index.js',
    path: resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
      }),
    ],
  },
  resolve: {
    extensions: ['.ts', '.mjs', '.js'],
  },
  target: 'node16',
  watch: NODE_ENV === 'development',
  watchOptions: {
    ignored: '!src',
  },
}
