const path = require('path')
const webpack = require('webpack')
const { version } = require('./package.json')

const root = path.resolve(__dirname, '../..')

module.exports = {
  name: 'embed',
  target: 'web',
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'jotx.min.js',
    // Heavy libraries (Mermaid, Chart.js, KaTeX) load as separate chunks only when a document needs them.
    // 'auto' finds the chunks next to jotx.min.js, so the same files work from a CDN or from your own site.
    chunkFilename: 'chunks/[name].[contenthash:8].js',
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
    publicPath: 'auto',
    library: { name: 'Jotx', type: 'umd', export: undefined },
    clean: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      // Compile the editor from source so its lazy imports become real chunks
      '@jotx-labs/editor': path.resolve(root, 'packages/editor/src'),
      react: path.resolve(root, 'node_modules/react'),
      'react-dom': path.resolve(root, 'node_modules/react-dom')
    },
    // core falls back to Node's crypto only when Web Crypto is missing, which no browser lacks
    fallback: { crypto: false }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: { configFile: path.resolve(__dirname, 'tsconfig.json'), transpileOnly: true }
        }
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.(woff2?|ttf|otf|eot)$/, type: 'asset/resource' }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({ __JOTX_VERSION__: JSON.stringify(version) })
  ],
  performance: { hints: false },
  devtool: false
}
