const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const resolve = dir => {
  return path.join(__dirname, dir)
}
process.env.VUE_APP_VERSION = require('./package.json').version

module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  chainWebpack: config => {
    // 配置别名
    config.resolve.alias
      .set('@', resolve('src'))
      .set('~', resolve('src/components'))
  },
  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      config.optimization = {
        // 启用最小化压缩
        minimize: true,
        minimizer: [new TerserPlugin({
          // sourceMap: false, // 和productionSourceMap一样
          extractComments: false,
          terserOptions: {
            output: {
              // 删除注释
              comments: false
            },
            compress: {
              // 删除console
              drop_console: true,
              // 删除debug
              drop_debugger: true,
              pure_funcs: ['console.log']
            }
          }
        })]
      }

      // 只给出 js 文件的性能提示
      config.performance = {
        assetFilter: function (assetFilename) {
          return assetFilename.endsWith('.js')
        }
      }
    }
  },
  pluginOptions: {
    'style-resources-loader': {
      preProcessor: 'less',
      patterns: [
        path.resolve(__dirname, './src/styles/variable.less'),
        path.resolve(__dirname, './src/styles/mixins.less')
      ]
    },
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        appId: 'com.ahf.autoCheck',
        productName: '自动巡查',
        copyright: 'Copyright © 2021 贵州东彩供应链有限公司',
        artifactName: 'AutoCheck Setup ${version}.${ext}',
        win: {
          icon: 'public/logo.png',
          target: {
            target: 'nsis',
            arch: [
              'x64',
              'ia32'
            ]
          }
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        },
        mac: {
          icon: 'public/logo.png'
        }
      }
    }
  }
}
