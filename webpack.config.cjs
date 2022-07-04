var path = require("path");
var webpack = require('webpack');

module.exports = {
    entry: ['@babel/polyfill', './bin/index.js'],
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "[name].js",
        chunkFormat: 'commonjs',
        library: {
          type: 'commonjs2',
        },
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.ts', '.tsx','.scss'],
      modules: [path.resolve(__dirname, 'node_modules')]
    },
    devtool: false,
    module: {
        rules: [
          {
            test: /\.node$/,
            loader: "node-loader",
          },
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env']
                }
            }
        }
        ]
    }
};
