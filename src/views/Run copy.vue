<template>
  <div class="home-con">
    <el-input placeholder="请输入内容" :value="curEnv" class="top-input" readonly size="medium">
      <el-select v-model="curEnv" slot="prepend" placeholder="请选择" style="width: 120px;">
        <el-option v-for="item in envList" :key="item.name" :label="item.name" :value="item.url"></el-option>
      </el-select>
    </el-input>
    <div class="tool-btns">
      <el-button v-if="!running" type="primary" icon="el-icon-video-play" @click="startCheck">开始巡查</el-button>
      <el-button v-else type="danger" icon="el-icon-video-pause" @click="stopCheck">停止巡查</el-button>
      <div style="float: right;">
        <el-button :icon="showType == 0 ? 'el-icon-view' : 'el-icon-document'" @click="toggleView">{{showType == 0 ? '查看结果' : '查看日志'}}</el-button>
        <el-button icon="el-icon-download">导出结果</el-button>
      </div>
    </div>
    <div class="log-con" v-if="showType == 0">
      <p class="title">巡查日志</p>
      <el-scrollbar ref="logScrollbar" wrap-class="scrollbar-wrapper" style="height: 100%;">
        <ul class="log-list">
          <li v-for="(item, index) in logList" :key="index" :style="{color: item.c}">
            <label>{{item.t}}</label>{{item.s}}
          </li>
        </ul>
      </el-scrollbar>
    </div>
    <el-table
      v-else
      :data="webCamList"
      height="calc(100% - 90px)"
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
        width="250">
        <span slot-scope="scope" :style="{color: scope.row.exceptionNum > 0 ? 'red' : ''}">{{scope.row.name}}</span>
      </el-table-column>
      <el-table-column
        label="抵质押数"
        prop="cattleNum"
        width="120"
        align="center">
      </el-table-column>
      <el-table-column
        label="监控视频数"
        prop="videoNum"
        width="120"
        align="center">
      </el-table-column>
      <el-table-column
        label="异常监控数"
        prop="exceptionNum"
        width="120"
        align="center">
      </el-table-column>
      <el-table-column
        label="备注"
        prop="remark">
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  name: 'Run',
  data() {
    return {
      envList: [
        {
          url: 'https://show.gynsh.com/',
          name: '生产环境'
        },
        {
          url: 'http://uat-show.dongcaitech.cn:180/',
          name: 'UAT环境'
        },
        {
          url: 'http://47.102.145.51:7776/',
          name: 'FAT环境'
        }
      ],
      curEnv: null,
      running: false,
      showType: 0, // 0-日志   1-数据
      logList: [],
      webCamList: []
    }
  },
  created() {
    this.curEnv = this.envList[0].url
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
    ipcRenderer.on('webCamData', (e, list) => {
      this.webCamList = list || []
    })
    ipcRenderer.on('closeWebCamWin', () => {
      this.running = false
    })
  },
  beforeDestroy() {
    this.stopCheck()
  },
  methods: {
    startCheck() {
      ipcRenderer.send('startCheckWebCam', this.curEnv)
      this.running = true
      this.showType = 0
      this.webCamList = []
      this.logList = []
    },
    stopCheck() {
      ipcRenderer.send('stopCheckWebCam')
      this.running = false
    },
    toggleView() {
      this.showType = this.showType === 1 ? 0 : 1
    }
  }
}
</script>

<style lang="less" scoped>
.home-con {
  height: 100%;
}
.tool-btns {
  flex-shrink: 0;
  margin-top: 12px;
  margin-bottom: 12px;
}
.title {
  font-size: 16px;
}
.log-con {
  height: calc(100% - 90px);
  background: #545c64;
  border-radius: 5px;
  padding: 32px 12px 12px;
  position: relative;
  font-size: 14px;
  color: #FFFFFF;
  box-sizing: border-box;
  .title {
    position: absolute;
    top: 8px;
    left: 12px;
    color: #A0A0A0;
    font-size: 12px;
  }
}
.log-list {
  li {
    line-height: 1.5;
    color: #F0F0F0;
    font-size: 13px;
    margin-bottom: 4px;
    label {
      color: #D0D0D0;
      margin-right: 16px;
    }
  }
}
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
</style>