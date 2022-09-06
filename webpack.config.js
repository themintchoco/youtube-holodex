import path from 'path'
import { fileURLToPath } from 'url'

import HtmlWebpackPlugin from 'html-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'

import packageJson from './package.json' assert {type: 'json'}


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config = {
  entry: {
    content: path.join(__dirname, 'src', 'pages', 'content', 'index.tsx'),
    background: path.join(__dirname, 'src', 'pages', 'background', 'index.ts'),
    options: path.join(__dirname, 'src', 'pages', 'options', 'index.tsx'),
  },
  
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [
          path.resolve(__dirname, 'src'),
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
            },
          },
        ],
      },
      
      {
        test: /\.scss$/,
        include: [
          path.resolve(__dirname, 'src'),
        ],
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: { exportLocalsConvention: 'camelCaseOnly' },
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['@csstools/postcss-sass', { outputStyle: 'compressed' }],
                  'autoprefixer',
                ],
              },
            },
          },
        ],
      },

      {
        test: /\.svg$/,
        include: [
          path.resolve(__dirname, 'src', 'assets', 'icons'),
        ],
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              icon: true,
            },
          },
        ],
      },

      {
        test: /\.html$/,
        include: [
          path.resolve(__dirname, 'src'),
        ],
        use: [
          'html-loader',
        ],
      },
      
    ],
  },
  
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, 'src', 'manifest.json'),
          transform(content) {
            return JSON.stringify({
              ...JSON.parse(content.toString()),
              version: packageJson.version,
              description: packageJson.description
            }, null, 2)
          }
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'pages', 'options', 'index.html'),
      filename: 'options.html',
      chunks: ['options'],
    }),
  ],

  resolve: {
    extensions: ['.js', '.ts', '.tsx']
  },
}

export default config
