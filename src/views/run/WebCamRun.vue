<template>
  <div class="run-box">
    <p class="title">摄像头巡查</p>
    <div class="log-box">
      <p class="log-title">巡查日志</p>
      <el-scrollbar ref="logScrollbar" wrap-class="scrollbar-wrapper">
        <ul class="log-list">
          <li v-for="(item, index) in logList" :key="index" :style="{color: item.c}">
            <label>{{item.t}}</label>{{item.s}}
          </li>
        </ul>
      </el-scrollbar>
    </div>
    <div class="progress-bar">
      <el-progress :text-inside="true" :stroke-width="20" :percentage="progress"></el-progress>
      <div v-if="!running" class="run-btn start-btn" @click="startCheck" title="开始巡查"></div>
      <div v-else class="run-btn stop-btn" @click="stopCheck" title="停止巡查"></div>
      <el-button icon="el-icon-view" circle title="查看数据" @click="viewData"></el-button>
      <el-button icon="el-icon-download" circle title="导出数据"></el-button>
    </div>

    <el-dialog
      title="摄像头巡查数据"
      :visible.sync="showDataDialog"
      :close-on-click-modal="false"
      destroy-on-close
      top="8vh"
      width="880px"
      custom-class="data-dialog">
      <el-form ref="searchForm" :model="searchForm" inline>
        <el-form-item label="企业名称">
          <el-input v-model="searchForm.enterpriseName" placeholder="模糊匹配企业名称" clearable @change="filterList" style="width: 180px;"/>
        </el-form-item>
        <el-form-item label=" " label-width="50px">
          <el-checkbox v-model="searchForm.onlyFail" @change="filterList">只查异常</el-checkbox>
        </el-form-item>
      </el-form>
      <el-table
      :data="tableList"
      height="450px"
      style="width: 100%">
        <el-table-column type="expand">
          <template slot-scope="props">
            <ul class="video-list">
              <li v-for="(video, index) in props.row.videoList" :key="index" :class="{error: video.statusCode !== 0 && video.statusCode != null}">
                【{{video.name}}】 {{video.statusStr}}
              </li>
            </ul>
          </template>
        </el-table-column>
        <el-table-column
          label="企业名称"
          prop="name"
          width="240">
          <span slot-scope="scope" :style="{color: scope.row.exceptionNum > 0 ? 'red' : ''}">{{scope.row.name}}</span>
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
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data() {
    return {
      showDataDialog: false,
      running: false,
      progress: 0,
      logList: [],
      searchForm: {
        enterpriseName: '',
        onlyFail: false
      },
      webCamList: [],
      tableList: []
    }
  },
  mounted() {
    ipcRenderer.on('webCamLog', (e, log) => {
      this.logList.push(log)
      if (this.$refs.logScrollbar) {
        this.$nextTick(() => {
          this.$refs.logScrollbar.wrap.scrollTop = this.$refs.logScrollbar.wrap.scrollHeight
        })
      }
    })
    ipcRenderer.on('webCamProgress', (e, val) => {
      this.progress = parseFloat((val * 100).toFixed(2))
    })
    ipcRenderer.on('webCamData', (e, list) => {
      this.webCamList = list || []
    })
    ipcRenderer.on('closeWebCamWin', () => {
      this.running = false
    })
  },
  beforeDestroy() {
    ipcRenderer.send('stopCheckWebCam')
    // 移除监听器
    ipcRenderer.removeAllListeners(['webCamLog', 'webCamProgress', 'webCamData', 'closeWebCamWin'])
  },
  methods: {
    startCheck() {
      ipcRenderer.send('startCheckWebCam')
      this.running = true
      this.progress = 0
      this.webCamList = []
      this.logList = []
    },
    stopCheck() {
      this.$confirm('是否停止摄像头巡查?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        ipcRenderer.send('stopCheckWebCam')
        this.running = false
      })
    },
    viewData() {
      this.showDataDialog = true
      this.searchForm = {
        enterpriseName: '',
        onlyFail: false
      }
      this.tableList = this.webCamList.concat([])
    },
    filterList() {
      let list = this.webCamList.concat([])
      if (this.searchForm.enterpriseName) {
        list = list.filter(o => o.name && o.name.includes(this.searchForm.enterpriseName))
      }
      if (this.searchForm.onlyFail) {
        list = list.filter(o => o.exceptionNum > 0)
      }
      this.tableList = list
    }
  }
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