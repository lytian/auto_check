<template>
  <div class="run-box">
    <p class="title">摄像头巡查</p>
    <div class="log-box">
      <p class="log-title">巡查日志</p>
      <el-scrollbar ref="logScrollbar" wrap-class="scrollbar-wrapper">
        <ul class="log-list">
          <li v-for="(item, index) in state.logList" :key="index" :style="{color: item.c}">
            <label>{{item.t}}</label>{{item.s}}
          </li>
        </ul>
      </el-scrollbar>
    </div>
    <div class="progress-bar">
      <el-progress :text-inside="true" :stroke-width="20" :percentage="state.progress"></el-progress>
      <div v-if="!state.running" class="run-btn start-btn" @click="startCheck" title="开始巡查"></div>
      <div v-else class="run-btn stop-btn" @click="stopCheck" title="停止巡查"></div>
      <el-button icon="el-icon-view" circle title="查看数据" @click="viewData"></el-button>
      <el-button icon="el-icon-download" circle title="导出数据" @click="openDownloadForm"></el-button>
    </div>

    <el-dialog
      title="摄像头巡查数据"
      v-model="state.showDataDialog"
      :close-on-click-modal="false"
      destroy-on-close
      top="8vh"
      width="880px"
      custom-class="data-dialog">
      <el-form ref="searchFormRef" :model="searchForm" inline @submit.prevent>
        <el-form-item label="企业名称">
          <el-input v-model="searchForm.enterpriseName" placeholder="模糊匹配企业名称" clearable style="width: 180px;"/>
        </el-form-item>
        <el-form-item style="margin-left: 30px;">
          <el-checkbox v-model="searchForm.onlyFail">只查异常</el-checkbox>
        </el-form-item>
      </el-form>
      <el-table
      :data="filterList"
      height="450px"
      style="width: 100%">
        <el-table-column type="expand">
          <template #default="scope">
            <ul class="video-list">
              <li v-for="(video, index) in scope.row.videoList" :key="index" :class="{error: video.statusCode !== 0 && video.statusCode != null}">
                【{{video.name}}】 {{video.statusStr}}
              </li>
            </ul>
          </template>
        </el-table-column>
        <el-table-column
          label="企业"
          prop="name"
          width="240">
          <template #default="scope">
            <span :style="{color: !scope.row.ranchName && scope.row.exceptionNum > 0 ? 'red' : ''}">{{scope.row.name}}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="牧场"
          prop="name"
          width="100">
          <template #default="scope">
            <span :style="{color: scope.row.ranchName && scope.row.exceptionNum > 0 ? 'red' : ''}">{{scope.row.ranchName}}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="抵质押数"
          prop="cattleNum"
          width="100"
          align="center">
        </el-table-column>
        <el-table-column
          label="监控视频数"
          prop="videoNum"
          width="100"
          align="center">
        </el-table-column>
        <el-table-column
          label="异常监控数"
          prop="exceptionNum"
          width="100"
          align="center">
        </el-table-column>
        <el-table-column
          label="备注"
          prop="remark">
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog
      title="导出摄巡查数据"
      v-model="state.showDownloadForm"
      :close-on-click-modal="false"
      destroy-on-close
      top="8vh"
      width="640px"
      custom-class="data-dialog">
      <el-form ref="downloadFormRef" :model="downloadForm" label-width="80px" @submit.prevent>
        <el-form-item label="巡查人" prop="name" :rules="{ required: true, message: '请输入巡查人姓名', trigger: 'blur' }">
          <el-input v-model="downloadForm.name" placeholder="请输入巡查人姓名" maxlength="10"/>
        </el-form-item>
        <el-form-item label="离线基站" prop="offDevice">
          <el-input v-model="downloadForm.offDevice" type="textarea" :rows="10" placeholder="请钉钉预警中复制最新的预警数据" @keydown.enter="download"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="state.showDownloadForm = false">取 消</el-button>
        <el-button type="primary" @click="download">导 出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ipcRenderer } from 'electron'
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, computed, unref } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const logScrollbar = ref(null)
const downloadFormRef = ref(null)

const state = reactive({
  showDataDialog: false,
  showDownloadForm: false,
  running: false,
  progress: 0,
  logList: [],
  webCamList: []
})
const searchForm = reactive({
  enterpriseName: '',
  onlyFail: false
})
const downloadForm = reactive({
  name: '',
  offDevice: ''
})

onMounted(() => {
  ipcRenderer.on('webCamLog', (e, log) => {
    state.logList.push(log)
    const bar = unref(logScrollbar)
    if (bar && bar.wrap) {
      nextTick(() => {
        bar.wrap.scrollTop = bar.wrap.scrollHeight
      })
    }
  })
  ipcRenderer.on('webCamProgress', (e, val) => {
    state.progress = parseFloat((val * 100).toFixed(2))
  })
  ipcRenderer.on('webCamData', (e, list) => {
    state.webCamList = list || []
  })
  ipcRenderer.on('closeWebCamWin', () => {
    state.running = false
  })
  ipcRenderer.on('saveFinished', (e, res) => {
    if (res.code === '0') {
      ElMessage.success('保存成功')
      state.showDownloadForm = false
    } else {
      ElMessage.error(res.msg)
    }
  })
})

onBeforeUnmount(() => {
  ipcRenderer.send('stopCheckWebCam')
  // 移除监听器
  ipcRenderer.removeAllListeners(['webCamLog', 'webCamProgress', 'webCamData', 'closeWebCamWin'])
})

const filterList = computed(() => {
  let list = state.webCamList
  if (searchForm.enterpriseName) {
    list = list.filter(o => o.name && o.name.includes(searchForm.enterpriseName))
  }
  if (searchForm.onlyFail) {
    list = list.filter(o => o.exceptionNum > 0)
  }
  return list
})

/** 开始巡查 */
function startCheck() {
  if (state.progress > 0 && state.progress < 100) {
    ElMessageBox.confirm('摄像头还未巡查完毕，是否继续巡查？', '提示', {
      confirmButtonText: '继续巡查',
      cancelButtonText: '重新巡查',
      type: 'warning'
    }).then(() => {
      ipcRenderer.send('startCheckWebCam', true)
    }).catch(() => {
      ipcRenderer.send('startCheckWebCam')
    })
    return
  }
  ipcRenderer.send('startCheckWebCam')
  state.running = true
  state.progress = 0
  state.webCamList = []
  state.logList = []
}

/** 停止巡查 */
function stopCheck() {
  ElMessageBox.confirm('是否停止摄像头巡查?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ipcRenderer.send('stopCheckWebCam')
    state.running = false
  })
}

/** 查看数据 */
function viewData() {
  state.showDataDialog = true
  searchForm.enterpriseName = ''
  searchForm.onlyFail = false
}

/** 打开下载弹窗 */
function openDownloadForm() {
  if (state.running) return
  if (state.progress === 0) {
    ElMessage.warning('请先开始摄像头巡查！')
    return
  }

  if (state.progress < 100) {
    ElMessageBox.confirm('摄像头还未巡查完毕，是否继续导出数据？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      state.showDownloadForm = true
    })
    return
  }
  state.showDownloadForm = true
}

/** 下载Excel */
function download() {
  const downladFormEl = unref(downloadFormRef)
  downladFormEl.validate((valid) => {
    if (valid) {
      ipcRenderer.send('openSaveFileDialog', {
        name: downloadForm.name,
        offDevice: downloadForm.offDevice,
        webCamList: JSON.parse(JSON.stringify(state.webCamList))
      })
    }
  })
}
</script>

<style lang="less" scoped>
.data-dialog {
  .video-list {
    li {
      color: #333;
      &+li {
        margin-top: 6px;
      }
      &.error {
        color: red;
      }
    }
  }
}
</style>