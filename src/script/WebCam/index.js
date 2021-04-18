import { BrowserWindow, app, ipcMain } from 'electron'
import pie from 'puppeteer-in-electron'
import puppeteer from 'puppeteer-core'
import moment from 'moment'
import { printLog } from '../../utils/log'
import { getWebCamSetting, setWebCamSettingItem } from '../../utils/store'

let rootWin
let webCamWin
let webCamPage
let webCamSetting

let username
let password
let enterpriseList = []
let curEnterprise
let paginationNum = 0
let paginationIndex = 0
let videoList = []

// 开启巡查 - 摄像头
ipcMain.on('startCheckWebCam', async (event) => {
  webCamSetting = getWebCamSetting()
  rootWin = BrowserWindow.getFocusedWindow()
  if (rootWin == null) {
    rootWin = BrowserWindow.fromId(1)
  }
  const browser = await pie.connect(app, puppeteer)
  webCamWin = new BrowserWindow({
    width: 800,
    height: 600,
    modal: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    minimizable: false,
    fullscreen: webCamSetting.fullscreen
  })
  webCamWin.setMenuBarVisibility(false)
  const url = webCamSetting.checkUrl
  printLog('打开页面：' + url)
  // 加载指定URL
  await webCamWin.loadURL(url)
  // 关闭该弹窗
  webCamWin.on('closed', () => {
    if (rootWin) rootWin.webContents.send('closeWebCamWin')
    printLog('关闭页面，停止巡查')
  })
  webCamPage = await pie.getPage(browser, webCamWin)
  // 等待页面加载完成
  await webCamPage.waitForSelector('.el-form .el-form-item')
  // 设置用户名和密码
  if (webCamSetting.rememberPassword) {
    if (webCamSetting.username) await webCamPage.type('.el-form .el-form-item:nth-child(2) input', webCamSetting.username, { delay: 100 })
    if (webCamSetting.password) await webCamPage.type('.el-form .el-form-item:nth-child(3) input', webCamSetting.password, { delay: 100 })
  }
  // 自动聚焦到用户名
  if (webCamSetting.rememberPassword && webCamSetting.username) {
    await webCamPage.focus('.el-form .el-form-item:nth-child(4) input')
  } else {
    await webCamPage.focus('.el-form .el-form-item:nth-child(2) input')
  }
  // 监听登录请求
  webCamPage.on('request', loginRequest)
  // 等待登录成功
  await webCamPage.waitForResponse(async res => {
    if (res.url().indexOf('/authentication/login') > -1) {
      if (res.status() === 200) {
        const data = await res.json()
        if (data.code === 200) {
          return true
        }
      }
    }
  }, {
    timeout: 0
  })
  printLog('登录成功！登录账号：' + username)
  // 存储用户名和密码
  if (webCamSetting.rememberPassword) {
    setWebCamSettingItem('username', username)
    setWebCamSettingItem('password', password)
  }
  // 移除网络请求监听
  webCamPage.removeListener('request', loginRequest)
  await asyncTimeout(500)
  printLog('跳转【视频监控】页面，' + url + 'video')
  // 挂载方法到window对象
  await webCamPage.exposeFunction('onCustomEvent', (ev) => {
    if (ev.origin === 'https://open.ys7.com' && typeof ev.data === 'object') {
      const { id, code } = ev.data
      const video = videoList.find(o => (o.id === 'frame' + id))
      if (video) {
        handleVideo(video, code)
      }
    }
  })
  // 监听message事件
  await webCamPage.evaluateOnNewDocument(() => {
    window.addEventListener('message', (ev) => {
      window.onCustomEvent({
        origin: ev.origin,
        data: ev.data
      })
    }, false)
  })
  await webCamPage.goto(url + 'video')
  await getCurEnterprise()
  await getCurPageVideo()
})

// 关闭巡查 - 摄像头
ipcMain.on('stopCheckWebCam', () => {
  stopCheck()
})

async function loginRequest(req) {
  if (req.url().indexOf('/authentication/login') > -1) {
    username = await webCamPage.$eval('.el-form .el-form-item:nth-child(2) input', el => el.value)
    password = await webCamPage.$eval('.el-form .el-form-item:nth-child(3) input', el => el.value)
  }
}

/** 停止检查 */
async function stopCheck() {
  if (webCamPage && !webCamPage.isClosed()) {
    // 移除网络请求监听
    webCamPage.removeListener('request', loginRequest)
    await webCamPage.close()
  }
  webCamPage = null
  if (webCamWin && !webCamWin.isDestroyed()) {
    webCamWin.close()
  }
  webCamWin = null
}

function asyncTimeout(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

/** 获取当前企业 */
async function getCurEnterprise() {
  const videoTotal = await getVideoTotal()
  const cattleNum = await webCamPage.$eval('.video-pagination .cattle-num span', (ele) => ele.innerText)
  const curText = await webCamPage.$eval('.enterprise-list .active', (ele) => ele.innerText)
  if (enterpriseList.length === 0) {
    enterpriseList = await webCamPage.$$eval('.enterprise-list li', (elements) => {
      const eles = []
      elements.forEach(function(item, index) {
        eles.push({
          name: item.innerText, // 企业名称
          cattleNum: 0, // 抵质押数
          videoNum: 0, // 接视频数
          exceptionNum: 0, // 异常数
          videoList: [], // 异常详情
          finished: false, // 巡查结束
          remark: ''
        })
      })
      return eles
    })
    sendWebCamData()
  }
  curEnterprise = enterpriseList.find(o => o.name === curText)
  printLog(curEnterprise.name + ': 抵质押数=' + cattleNum + ', 监控视频数=' + videoTotal)
  if (videoTotal === 0) {
    curEnterprise.finished = true
    sendWebCamProgress()
    // 没有监控，直接下一家企业
    await nextEnterprise()
    return
  }
  sendWebCamData()
  curEnterprise.videoNum = videoTotal
  curEnterprise.cattleNum = cattleNum
  paginationNum = await webCamPage.$$eval('.video-pagination .el-pager .number', (elements) => elements.length)
  videoList = []
  paginationIndex = 1
}

/** 获取截图情况 */
async function getEnterpriseCapture(video, index) {
  // 查找当前页，是否有成功的摄像头
  printLog(`获取【${video.name}】监控截图`)
  // 点击截图按钮
  const captureEle = await webCamPage.$(`.video-main .el-row .el-col:nth-child(${index + 1}) .video-title-wrap .video-icon:nth-child(2)`)
  if (captureEle == null) return
  setTimeout(() => {
    captureEle.click()
  }, 200)
  curEnterprise.remark = '所有截图正常'
  // 获取全部截图
  await webCamPage.waitForResponse(res => {
    if (res.url().indexOf('/show/camera/capture/list') > -1) {
      if (res.status() === 200) {
        res.json().then(data => {
          if (data.code === 200) {
            if (data.total === 0) {
              curEnterprise.remark += '【全部截图】无数据'
              return
            }
            // 查询当日是否有截图
            const index = data.data.findIndex(o => o.attachmentName.startsWith(moment().format('YYYYMMDD')))
            if (index === -1) {
              curEnterprise.remark += '【全部截图】今日无数据'
            }
          }
        })
      }
      return true
    }
  })
  await asyncTimeout(200)
  const alermEle = await webCamPage.$('.capture-tab .capture-tab-item:nth-child(2)')
  if (alermEle == null) return
  setTimeout(() => {
    alermEle.click()
  }, 200)
  // 人形监测截图
  await webCamPage.waitForResponse(res => {
    // console.log(res.url())
    if (res.url().indexOf('/show/camera/alarm/list') > -1) {
      if (res.status() === 200) {
        res.json().then(data => {
          if (data.code === 200) {
            if (data.total === 0) {
              curEnterprise.remark += '，【人形监测截图】无数据'
              return
            }
            // 查询当日是否有截图
            const index = data.data.findIndex(o => o.attachmentName.startsWith(moment().format('YYYYMMDD')))
            if (index === -1) {
              curEnterprise.remark += '，【人形监测截图】今日无数据'
            }
          }
        })
      }
      return true
    }
  })
  // 关闭弹窗
  await webCamPage.tap('.capture-dialog .monitor-toast-close')
  await asyncTimeout(500)
}

/** 获取视频总数 */
async function getVideoTotal() {
  let videoNum = 0
  await webCamPage.waitForResponse(async (res) => {
    if (res.url().indexOf('show/camera/videoList') > -1) {
      const status = res.status()
      if (status === 200) {
        const data = await res.json()
        if (data.code === 200) {
          videoNum = data.total
        }
      }
      return true
    }
  })
  return videoNum
}

/** 获取当前页视频 */
async function getCurPageVideo() {
  paginationIndex = parseInt(await webCamPage.$eval('.video-pagination .el-pager .active', (ele) => ele.innerText))
  videoList = await webCamPage.$$eval('.video-item', (elements) => {
    const eles = []
    let iframe
    let name
    elements.forEach(function(item, index) {
      iframe = item.querySelector('iframe')
      name = item.querySelector('.video-title').innerText
      eles.push({
        id: iframe.id, // 摄像头ID
        name: name, // 摄像头名称
        statusCode: null, // 状态码
        statusStr: '' // 异常详情
      })
    })
    return eles
  })
}

/** 处理视频结果 */
async function handleVideo(video, code) {
  let msg
  switch (code) {
    case 0:
      msg = '正常'
      break
    case 5404:
      msg = '设备不在线'
      break
    case 5405:
      msg = '流媒体响应超时'
      break
    case 5451:
      msg = '设备不支持的码流类型'
      break
    case 6519:
      msg = '设备推流链路网络不稳定'
      break
    case 9048:
      msg = '同时播放数限制'
      break
    case 6106:
      msg = '设备返回错误码4'
      break
    case 20018:
      msg = '用户不拥有该设备'
      break
    default:
      msg = '未知错误'
      break
  }
  video.statusCode = code
  video.statusStr = msg
  // 是否全部返回
  if (videoList.every(o => o.statusCode != null)) {
    printLog(`${curEnterprise.name}: 第${paginationIndex}页的视频已处理完毕`)
    curEnterprise.videoList = curEnterprise.videoList.concat(videoList)
    sendWebCamData()
    // 在翻页前，先进行获取摄像头截图
    if (webCamSetting.captureEnterpriseName === curEnterprise.name &&
        !curEnterprise.remark) {
      let flag = false
      for (let i = 0; i < videoList.length; i++) {
        const v = videoList[i]
        if (v.name === webCamSetting.captureVideoName) {
          flag = true
          await getEnterpriseCapture(v, i)
          break
        }
      }
      if (!flag) {
        curEnterprise.remark = '该企业摄像头不能正常播放，故没有查看截图'
      }
    }
    if (paginationIndex === paginationNum) {
      const exceptionNum = curEnterprise.videoList.filter(o => o.statusCode !== 0).length
      curEnterprise.exceptionNum = exceptionNum
      curEnterprise.finished = true
      if (exceptionNum > 0) {
        printLog(`${curEnterprise.name}: ${exceptionNum}个异常`, 'red')
      } else {
        printLog(`${curEnterprise.name} 没有异常`, '#11d211')
      }
      printLog('已到最后一页，切换下一个企业。')
      sendWebCamProgress()
      await nextEnterprise()
    } else {
      await nextPage()
    }
  }
}

/** 跳转下一页 */
async function nextPage() {
  printLog(`进入第${paginationIndex + 1}页`)
  await webCamPage.tap(`.video-pagination .el-pager .number:nth-child(${paginationIndex + 1})`)
  // 等待数据加载完成
  await getVideoTotal()
  await getCurPageVideo()
}

/** 跳转下一个企业 */
async function nextEnterprise() {
  const entIndex = enterpriseList.findIndex(o => o.name === curEnterprise.name)
  if (entIndex === (enterpriseList.length - 1)) {
    printLog('已巡查完毕')
    stopCheck()
  } else {
    await webCamPage.tap(`.enterprise-list li:nth-child(${entIndex + 2})`)
    await getCurEnterprise()
    await getCurPageVideo()
  }
}

/** 发送监控数据 */
function sendWebCamData() {
  if (rootWin == null) return
  rootWin.webContents.send('webCamData', enterpriseList)
}

/** 发送进度 */
function sendWebCamProgress() {
  if (rootWin == null) return
  const finishedNum = enterpriseList.filter(o => o.finished === true).length
  rootWin.webContents.send('webCamProgress', finishedNum / enterpriseList.length)
}