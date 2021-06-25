<template>
  <el-form class="run-box" :model="webCamForm" :rules="webCamRules" ref="webCamFormRef" label-width="100px">
    <p class="title">摄像头巡查设置</p>
    <el-form-item label="巡查地址" prop="checkUrl">
      <el-input v-model.trim="webCamForm.checkUrl" placeholder="请输入巡查地址"></el-input>
    </el-form-item>
    <el-form-item label="默认全屏" prop="fullscreen">
      <el-radio-group v-model="webCamForm.fullscreen">
        <el-radio :label="true">是</el-radio>
        <el-radio :label="false">否</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="登录过后" prop="rememberPassword">
      <el-radio-group v-model="webCamForm.rememberPassword">
        <el-radio :label="true">记住密码</el-radio>
        <el-radio :label="false">不记住密码</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="截图企业" prop="captureEnterpriseName">
      <el-input v-model.trim="webCamForm.captureEnterpriseName" placeholder="请输入截图企业名称"></el-input>
    </el-form-item>
    <el-form-item label="截图摄像头" prop="captureVideoName">
      <el-input v-model.trim="webCamForm.captureVideoName" placeholder="请输入截图摄像头名称"></el-input>
    </el-form-item>
    <el-form-item style="margin-bottom: 4px;">
      <el-button type="primary" @click="submitWebCam">保存</el-button>
      <el-button @click="resetWebCam">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
import { getWebCamSetting, resetWebCamSetting, setWebCamSetting } from '@/utils/store'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

export default {
  setup() {
    const webCamForm = reactive({
      checkUrl: '',
      fullscreen: true,
      rememberPassword: true,
      captureEnterpriseName: '',
      captureVideoName: ''
    })
    const webCamRules = reactive({
      checkUrl: { required: true, message: '请输入巡查地址', trigger: 'blur' },
      fullscreen: { required: true, type: 'boolean', massage: '请选择', trigger: 'blur' },
      rememberPassword: { required: true, type: 'boolean', massage: '请选择', trigger: 'blur' },
      captureEnterpriseName: { required: true, message: '请输入截图企业名称', trigger: 'blur' },
      captureVideoName: { required: true, message: '请输入截图摄像头名称', trigger: 'blur' }
    })
    const webCamFormRef = ref(null)

    onMounted(() => {
      const obj = getWebCamSetting()
      for (const key in webCamForm) {
        if (Object.hasOwnProperty.call(obj, key)) {
          webCamForm[key] = obj[key]
        }
      }
    })

    const submitWebCam = () => {
      webCamFormRef.value.validate(valid => {
        if (valid) {
          setWebCamSetting(webCamForm)
          ElMessage.success({
            showClose: true,
            message: '摄像头巡查设置成功'
          })
        }
      })
    }
    const resetWebCam = () => {
      resetWebCamSetting()
      const obj = getWebCamSetting()
      for (const key in webCamForm) {
        if (Object.hasOwnProperty.call(obj, key)) {
          webCamForm[key] = obj[key]
        }
      }
      ElMessage.success({
        showClose: true,
        message: '摄像头巡查设置成功'
      })
    }

    return {
      webCamForm,
      webCamRules,
      webCamFormRef,
      submitWebCam,
      resetWebCam
    }
  }
}
</script>