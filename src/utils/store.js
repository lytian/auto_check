import Store from 'electron-store'

const webCamStore = new Store({
  name: 'webCamSetting',
  schema: {
    // 巡查地址
    checkUrl: {
      type: 'string',
      default: 'https://show.gynsh.com/'
    },
    // 全屏显示
    fullscreen: {
      type: 'boolean',
      default: false
    },
    // 记住密码
    rememberPassword: {
      type: 'boolean',
      default: true
    },
    // 监控截图查找的企业
    captureEnterpriseName: {
      type: 'string',
      default: '贵州牛犇犇农业发展有限责任公司'
    },
    // 监控截图查找的企业
    captureVideoName: {
      type: 'string',
      default: '二号圈3'
    },
    // 登录过后的账户
    username: {
      type: 'string',
      default: ''
    },
    password: {
      type: 'string',
      default: ''
    }
  }
})

export function getWebCamSetting() {
  const result = {}
  for (const val of webCamStore) {
    result[val[0]] = webCamStore.get(val[0])
  }
  return result
}

export function setWebCamSetting(obj) {
  if (obj == null || typeof obj !== 'object') return
  for (const key in obj) {
    if (webCamStore.has(key)) {
      webCamStore.set(key, obj[key])
    }
  }
}

export function setWebCamSettingItem(key, value) {
  if (webCamStore.has(key)) {
    webCamStore.set(key, value)
  }
}

export function resetWebCamSetting() {
  webCamStore.clear()
}