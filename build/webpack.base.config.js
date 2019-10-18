const path = require("path");
const nodeExternals = require("webpack-node-externals");
const FriendlyErrorsWebpackPlugin = require("friendly-errors-webpack-plugin");
const VueLoaderPlugin = require('vue-loader/lib/plugin');

const translateEnvToMode = (env) => {
  if (env === "production") {
    return "production";
  }
  return "development";
};

module.exports = env => {
  return {
    target: "electron-renderer",
    mode: translateEnvToMode(env),
    node: {
      __dirname: false,
      __filename: false
    },
    externals: [nodeExternals({
      // this WILL include `jquery` and `webpack/hot/dev-server` in the bundle, as well as `lodash/*`
      whitelist: ['bootstrap-vue','vue','typeface-roboto','typeface-rajdhani']
      
    })],
    resolve: {
      extensions: ['*', '.js', '.vue', '.json', '.css', '.scss'],

      mainFields: ["main", "browser"],
      alias: {
        vue$: 'vue/dist/vue.min.js',
        env: path.resolve(__dirname, `../config/env_${env}.json`),
        '~': path.resolve(__dirname, '../src/')
      }
    },
    devtool: "source-map",
    module: {
      rules: [{
        test: /node_modules[/\\](bytebuffer)[/\\].+/,
        resolve: {
          aliasFields: ["main"]
        }
      },{
          test: /node_modules[/\\](iconv-lite)[/\\].+/,
          resolve: {
            aliasFields: ["main"]
          }
        }, {
          test: /node_modules[/\\](lzma)[/\\].+/,
          resolve: {
            aliasFields: ["browser"]
          }
        },
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        },
        {
          test: /\.css$/,
          use: ["vue-style-loader", "css-loader"]
        },
        {
          test: /\.scss$/,
          use: [
            'vue-style-loader',
            'css-loader',
            'sass-loader'
          ]
        },
        {
          test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }]
        }
      ]
    },
    plugins: [
      new VueLoaderPlugin(),
      new FriendlyErrorsWebpackPlugin({
        clearConsole: env === "development"
      })
    ]
  };
};
