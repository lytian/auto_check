import { BrowserWindow } from 'electron'
import moment from 'moment'

let win
let format

export function initLog(dateFormat = 'YYYY-MM-DD HH:mm:ss') {
  win = BrowserWindow.fromId(1)
  format = dateFormat
}

/** 打印日志 */
export function printLog(text, color) {
  if (win == null) return
  win.webContents.send('webCamLog', {
    t: moment().format(format),
    s: text,
    c: color
  })
}