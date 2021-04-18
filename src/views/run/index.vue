<template>
  <el-row :gutter="12">
    <el-col :span="12">
      <WebCamRun />
    </el-col>
  </el-row>
</template>

<script>
import WebCamRun from './WebCamRun'

export default {
  name: 'Run',
  components: {
    WebCamRun
  }
}
</script>

<style lang="less" scoped>

</style>