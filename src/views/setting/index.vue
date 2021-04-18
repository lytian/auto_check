<template>
<el-row class="setting-container" :gutter="12">
  <el-col :span="12">
    <WebCamSetting />
  </el-col>
  <el-col :span="12">
  </el-col>
</el-row>
</template>

<script>
import WebCamSetting from './WebCamSetting'

export default {
  name: 'Setting',
  components: {
    WebCamSetting
  }
}
</script>