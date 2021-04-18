module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    '@vue/standard'
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // 不检测文件末尾是否为空行
    'eol-last': 0,
    // 不检测function的左括号{ 前的空格
    'space-before-function-paren': 0,
    // 关闭promise的reject必须返回Error对象
    'prefer-promise-reject-errors': 0,
    'no-template-curly-in-string': 0
  }
}
