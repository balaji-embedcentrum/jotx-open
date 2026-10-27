const path = require('path');
const { Compilation, sources } = require('webpack');

// Some dependencies bake their own absolute file path into the bundle (via import.meta.url).
// Replace the build machine's checkout path so packages never carry local folder names.
const repoRoot = path.resolve(__dirname, '../..');
class StripBuildPaths {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('StripBuildPaths', compilation => {
      compilation.hooks.processAssets.tap({ name: 'StripBuildPaths', stage: Compilation.PROCESS_ASSETS_STAGE_REPORT }, assets => {
        for (const [name, asset] of Object.entries(assets)) {
          if (!/\.js$/.test(name)) continue;
          const text = asset.source().toString();
          if (text.includes(repoRoot)) {
            compilation.updateAsset(name, new sources.RawSource(text.split(repoRoot).join('/jotx')));
          }
        }
      });
    });
  }
}

module.exports = [
  // Extension bundle
  {
    name: 'extension',
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    cache: { type: 'filesystem' },
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2'
    },
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader'
        }
      ]
    },
    plugins: [new StripBuildPaths()],
    devtool: false
  },
  // Webview bundle (React app)
  {
    name: 'webview',
    target: 'web',
    mode: 'production',
    entry: './src/webview/index.tsx',
    cache: { type: 'filesystem' },
    output: {
      path: path.resolve(__dirname, 'out/webview'),
      filename: 'webview.js',
      // Remove chunks left over from previous builds so they don't ship in the VSIX
      clean: true
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // Force singleton React instance
        'react': path.resolve(__dirname, '../../node_modules/react'),
        'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
        // Local @jotx-labs packages
        '@jotx-labs/editor': path.resolve(__dirname, '../editor'),
        '@jotx-labs/core': path.resolve(__dirname, '../core'),
        '@jotx-labs/standard-lib': path.resolve(__dirname, '../standard-lib')
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
              transpileOnly: true  // Skip type checking, rely on IDE and tsc separately
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.(woff2?|ttf|otf|eot)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]'
          }
        },
        {
          // Load dictionary files as raw text for spell checking
          test: /\.(aff|dic)$/,
          type: 'asset/source'
        }
      ]
    },
    devtool: false
  },
  // Graph view bundle (Sigma.js visualization)
  {
    name: 'graphView',
    target: 'web',
    mode: 'production',
    entry: './src/graph/graphView.ts',
    cache: { type: 'filesystem' },
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'graphView.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader'
        }
      ]
    },
    devtool: false
  }
];


