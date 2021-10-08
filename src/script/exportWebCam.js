import XLSX from 'xlsx'
import XLSXStyle from 'xlsx-style'
import moment from 'moment'

function parseDevice(offDevice) {
  const lines = offDevice.split('\n')
  const data = {}
  let orgName
  lines.forEach(line => {
    if (line.indexOf('【基站离线告警】 ') > -1) {
      const temp = line.split('【基站离线告警】 ')[1]
      if (temp) {
        data.reportTime = temp.split(' ')[1]
      } else {
        data.reportTime = ''
      }
    } else if (line.indexOf('离线基站设备号：') > -1) {
      orgName = line.substring(line.indexOf('【') + 1, line.indexOf('】'))
      data[orgName] = line.split('离线基站设备号：')[1]
    }
  })
  return data
}

function parseVideoList(org) {
  const obj = {
    result: '',
    style: {
      font: {
        color: { rgb: 'FF000000' }
      }
    }
  }
  if (!org.cattleNum) {
    obj.result = '无抵质押牛只'
    obj.style = {
      font: {
        color: { rgb: 'FFCCCCCC' }
      }
    }
  } else if (!org.videoNum) {
    obj.result = '无摄像头'
    obj.style = {
      font: {
        color: { rgb: 'FFCCCCCC' }
      }
    }
  } else if (org.exceptionNum) {
    let exceptionList = org.videoList.filter(o => o.statusCode !== 0)
    const first = org.videoList[0]
    if (org.exceptionNum === org.videoList.length &&
        exceptionList.every(o => o.statusCode === first.statusCode)) {
      // 所有都是同一个错误码
      obj.result = '【所有】' + first.statusStr
      obj.style = {
        font: {
          bold: first.statusCode === 5404,
          color: { rgb: 'FFFF0000' }
        }
      }
    } else if (exceptionList.find(o => o.statusCode === 9048)) {
      // 包含同时播放限制
      obj.result = '同时播放限制'
      exceptionList = exceptionList.filter(o => o.statusCode !== 9048)
      exceptionList.forEach(item => {
        obj.result += `\n【${item.name}】${item.statusStr}`
      })
    } else {
      obj.result = exceptionList.map(o => `【${o.name}】${o.statusStr}`).join('\n')
    }
  }
  return obj
}

/**
 * worksheet转成ArrayBuffer
 * @param {worksheet} s xlsx库中的worksheet
 */
// function s2ab(s) {
//   if (typeof ArrayBuffer !== 'undefined') {
//     const buf = new ArrayBuffer(s.length)
//     const view = new Uint8Array(buf)
//     for (let i = 0; i !== s.length; ++i) {
//       view[i] = s.charCodeAt(i) & 0xFF
//     }
//     return buf
//   } else {
//     const buf = new Array(s.length)
//     for (let i = 0; i !== s.length; ++i) {
//       buf[i] = s.charCodeAt(i) & 0xFF
//     }
//     return buf
//   }
// }

/**
 * 表头字母转换成数字。（进制转换）
 * @param {string} str 需要装换的字母
 */
function stringToNum(str) {
  const temp = str.toLowerCase().split('')
  const len = temp.length
  const getCharNumber = function(charx) {
    return charx.charCodeAt() - 96
  }
  let numout = 0
  let charnum = 0
  for (let i = 0; i < len; i++) {
    charnum = getCharNumber(temp[i])
    numout += charnum * Math.pow(26, len - i - 1)
  }
  return numout
}

/**
 * 导出巡查数据
 * 返回文件名，以及文件Blob
 */
export default function exportWebCam(webCamList, name, offDevice, filePath) {
  const list = []
  const date = moment().format('YYYY-MM-DD')
  // 处理摄像头巡查数据
  const screenshotObj = webCamList.find(o => o.remark)
  let screenshotStr
  if (screenshotObj) {
    screenshotStr = screenshotObj.remark
  }
  let videoRes
  webCamList.forEach(item => {
    videoRes = parseVideoList(item)
    list.push({
      date: date, // 巡查日期
      orgName: item.name, // 企业名称
      ranchName: item.ranchName, // 企业名称
      webCamStr: videoRes.result, // 摄像头情况
      screenshot: screenshotStr, // 截图情况
      reportTime: '', // 基站巡查时间
      reportDevice: '', // 基站情况
      username: name, // 记录人
      result: '', // 反馈结果
      videoStyle: videoRes.style
    })
  })
  if (offDevice) {
    const deviceObj = parseDevice(offDevice)
    // 合并数据
    list.forEach(item => {
      item.reportTime = deviceObj.reportTime
      if (deviceObj[item.orgName]) {
        item.reportDevice = deviceObj[item.orgName]
      }
    })
  }

  const borderStyle = {
    style: 'thin',
    color: 'FF000000'
  }
  const allBorder = {
    top: borderStyle,
    right: borderStyle,
    bottom: borderStyle,
    left: borderStyle
  }
  const headers = [{
    date: '日期',
    orgName: '企业名称',
    ranchName: '牧场名称',
    webCamStr: '摄像头是否在线',
    screenshot: '截图是否正常',
    reportDevice: '基站是否在线',
    reportTime: '巡查时间',
    username: '记录人',
    result: '运营反馈结果'
  }]
  const keys = Object.keys(headers[0])
  // 过滤显示数据
  const listCopy = list.map(o => {
    const temp = {}
    for (const key of keys) {
      temp[key] = o[key]
    }
    return temp
  })
  const wb = XLSX.utils.book_new()
  // 创建表头
  const ws = XLSX.utils.json_to_sheet(headers, {
    header: keys,
    skipHeader: true
  })
  // 输入数据
  XLSX.utils.sheet_add_json(ws, listCopy, { header: keys, skipHeader: true, origin: 'A2' })
  wb.SheetNames.push('Sheet1')
  wb.Sheets.Sheet1 = ws
  // 表格样式
  let rowIndex, colIndex, dataKey, defaultStyle
  for (const key in ws) {
    /* eslint no-prototype-builtins: "off" */
    if (ws.hasOwnProperty(key) && !key.startsWith('!')) {
      rowIndex = parseInt(key.replace(/[^0-9]/ig, '')) - 1
      colIndex = stringToNum(key.replace(/[^A-Za-z]+$/ig, '')) - 1
      if (rowIndex === 0) {
        // 表头
        ws[key].s = Object.assign(ws[key].s || {}, {
          font: {
            name: '宋体',
            sz: '12',
            bold: true
          },
          alignment: { horizontal: 'center' },
          border: allBorder
        })
      } else {
        dataKey = keys[colIndex]
        if (['orgName', 'webCamStr', 'reportDevice'].includes(dataKey)) {
          defaultStyle = {
            font: {
              sz: '11'
            },
            alignment: {
              vertical: 'center',
              wrapText: true
            },
            border: allBorder
          }
        } else {
          defaultStyle = {
            font: {
              sz: '11'
            },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: allBorder
          }
        }
        if (dataKey === 'webCamStr') {
          const cellStyle = list[rowIndex - 1].videoStyle
          ws[key].s = Object.assign(ws[key].s || {}, defaultStyle, cellStyle)
        } else {
          ws[key].s = Object.assign(ws[key].s || {}, defaultStyle)
        }
      }
    }
  }
  // 设置列宽
  ws['!cols'] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 10 },
    { wch: 30 },
    { wch: 24 },
    { wch: 32 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 }
  ]
  // 合并单元格
  const orgNameMerges = []
  for (let i = 0; i < list.length; i++) {
    const count = list.filter(o => o.orgName === list[i].orgName).length
    if (count > 1) {
      orgNameMerges.push({
        s: { r: i + 1, c: 1 },
        e: { r: i + count, c: 1 }
      })
      // 跳过重复行
      i = i + count - 1
    }
  }

  ws['!merges'] = [
    // 日期
    {
      s: { r: 1, c: 0 },
      e: { r: list.length, c: 0 }
    },
    // 企业名称
    ...orgNameMerges,
    // 截图
    {
      s: { r: 1, c: 4 },
      e: { r: list.length, c: 4 }
    },
    // 巡查时间
    {
      s: { r: 1, c: 6 },
      e: { r: list.length, c: 6 }
    }
  ]
  // 导出
  XLSXStyle.writeFile(wb, filePath)
}