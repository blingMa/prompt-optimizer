<template>
  <Modal v-model="modalVisible" @confirm="handleConfirm">
    <template #title>
      {{ t('uploadSettings.title') }}
    </template>
    
    <div class="settings-form">
      <div class="section-title">{{ t('uploadSettings.ossConfig') }}</div>
      
      <div class="form-item">
        <label class="form-label">{{ t('uploadSettings.region') }}</label>
        <input
          v-model="form.region"
          :placeholder="t('uploadSettings.regionPlaceholder')"
          class="theme-manager-input"
        />
      </div>

      <div class="form-item">
        <label class="form-label">{{ t('uploadSettings.accessKeyId') }}</label>
        <input
            type="password"
            v-model="form.accessKeyId"
            :placeholder="t('uploadSettings.accessKeyIdPlaceholder')"
            class="theme-manager-input"
        />
      </div>

      <div class="form-item">
        <label class="form-label">{{ t('uploadSettings.accessKeySecret') }}</label>
        <input
            type="password"
            v-model="form.accessKeySecret"
            :placeholder="t('uploadSettings.accessKeySecretPlaceholder')"
            class="theme-manager-input"
        />
      </div>
      
      <div class="form-item">
        <label class="form-label">{{ t('uploadSettings.bucket') }}</label>
        <input
          v-model="form.bucket"
          :placeholder="t('uploadSettings.bucketPlaceholder')"
          class="theme-manager-input"
        />
      </div>
      
      <div class="form-item">
        <label class="form-label">{{ t('uploadSettings.endpoint') }}</label>
        <input
          v-model="form.endpoint"
          :placeholder="t('uploadSettings.endpointPlaceholder')"
          class="theme-manager-input"
        />
      </div>
    </div>
    
    <template #footer>
      <button @click="handleCancel" class="theme-button-secondary">
        {{ t('common.cancel') }}
      </button>
      <button @click="handleConfirm" class="theme-button-primary">
        {{ t('common.save') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import Modal from './Modal.vue'
import { createSettingsManager, StorageFactory, ElectronSettingsManagerProxy } from '@prompt-optimizer/core'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  config: {
    type: Object,
    default: null
  },
  uploadService: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'test', 'reinitialized'])

const modalVisible = ref(false)
const testing = ref(false)
const settingsManager = ref(null)
const currentSettingId = ref(null)

const form = reactive({
  region: '',
  accessKeyId: '',
  accessKeySecret: '',
  bucket: '',
  endpoint: '',
  secure: true,
  cname: false
})

// 初始化设置管理器
onMounted(async () => {
  try {
    console.log('[SettingsModal] Creating settings manager...')
    
    // 检查是否在Electron环境中
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('[SettingsModal] Using ElectronSettingsManagerProxy for desktop environment')
      settingsManager.value = new ElectronSettingsManagerProxy()
    } else {
      console.log('[SettingsModal] Using regular settings manager for web environment')
      const storageProvider = StorageFactory.create('localStorage')
      console.log('[SettingsModal] Storage provider created:', storageProvider)
      console.log('[SettingsModal] Storage provider type:', typeof storageProvider)
      console.log('[SettingsModal] Storage provider methods:', Object.getOwnPropertyNames(storageProvider))
      
      settingsManager.value = createSettingsManager(storageProvider)
    }
    
    console.log('[SettingsModal] Settings manager created:', settingsManager.value)
  } catch (error) {
    console.error('[SettingsModal] Failed to initialize settings manager:', error)
  }
})

// 初始化表单函数 - 将存储的配置显示在表单中
const initForm = (config) => {
  if (form && config) {
    console.log('[SettingsModal] 初始化表单，配置:', config)
    form.region = config.region || ''
    form.accessKeyId = config.accessKeyId || ''
    form.accessKeySecret = config.accessKeySecret || ''
    form.bucket = config.bucket || ''
    form.endpoint = config.endpoint || ''
    form.secure = config.secure !== undefined ? config.secure : true
    form.cname = config.cname !== undefined ? config.cname : false
  }
}

// 从设置管理器加载OSS配置
const loadOSSConfig = async () => {
  if (!settingsManager.value) return
  
  try {
    const ossSettings = await settingsManager.value.getSettings()
    if (ossSettings.length > 0) {
      const latestSetting = ossSettings[0] // 使用第一个配置
      currentSettingId.value = latestSetting.id
      initForm(latestSetting.config)
    }
  } catch (error) {
    console.error('[SettingsModal] Failed to load OSS config:', error)
  }
}

// 监听 modalVisible 变化
watch(() => props.modelValue, (newVal) => {
  modalVisible.value = newVal
  if (newVal) {
    console.log('[SettingsModal] Modal opened, loading OSS config')
    // 从设置管理器加载OSS配置
    loadOSSConfig()
  } else {
    console.log('[SettingsModal] Modal closed')
  }
})

watch(() => modalVisible.value, (newVal) => {
  emit('update:modelValue', newVal)
})

const handleCancel = () => {
  modalVisible.value = false
}

const handleTest = async () => {
  if (!form.region || !form.accessKeyId || !form.accessKeySecret || !form.bucket) {
    ElMessage.error(t('uploadSettings.requiredFields'))
    return
  }
  
  testing.value = true
  try {
    const testConfig = {
      region: form.region,
      accessKeyId: form.accessKeyId,
      accessKeySecret: form.accessKeySecret,
      bucket: form.bucket,
      endpoint: form.endpoint || undefined,
      secure: form.secure,
      cname: form.cname
    }
    
    // 使用设置管理器进行测试
    if (settingsManager.value) {
      const testSetting = {
        id: 'test-' + Date.now(),
        type: 'oss',
        name: 'Test OSS Setting',
        description: 'Temporary setting for testing',
        enabled: true,
        config: testConfig,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      await settingsManager.value.saveSetting(testSetting)
      await settingsManager.value.testSetting()
      
      // 清理测试设置
      // 注意：这里不需要删除测试设置，因为updateSetting已经处理了
    } else {
      // 回退到直接测试
      console.warn('[SettingsModal] Settings manager not available, cannot test upload service')
      throw new Error('Settings manager not available')
    }
    
    ElMessage.success(t('uploadSettings.testSuccess'))
    emit('test', testConfig)
  } catch (error) {
    console.error('Test failed:', error)
    ElMessage.error(t('uploadSettings.testFailed', { error: error.message }))
  } finally {
    testing.value = false
  }
}

const handleConfirm = async () => {
  if (!form.region || !form.accessKeyId || !form.accessKeySecret || !form.bucket) {
    ElMessage.error(t('uploadSettings.requiredFields'))
    return
  }
  
  const config = {
    region: form.region,
    accessKeyId: form.accessKeyId,
    accessKeySecret: form.accessKeySecret,
    bucket: form.bucket,
    endpoint: form.endpoint || undefined,
    secure: form.secure,
    cname: form.cname
  }
  
  try {
    // 使用设置管理器保存配置
    if (settingsManager.value) {
      // 使用 updateSetting 而不是 saveSetting
      await settingsManager.value.updateSetting(config)
    }
    
    // 重新初始化现有的uploadService以加载新配置
    if (props.uploadService && props.uploadService.reinitialize) {
      const reinitialized = await props.uploadService.reinitialize()
      if (reinitialized) {
        console.log('[SettingsModal] Upload service reinitialized successfully with new configuration')
        // 触发事件通知父组件uploadService已重新初始化
        emit('reinitialized')
      } else {
        console.warn('[SettingsModal] Failed to reinitialize upload service')
      }
    }
    
    emit('save', config)
    modalVisible.value = false
    ElMessage.success(t('uploadSettings.saveSuccess'))
  } catch (error) {
    console.error('Failed to save OSS config:', error)
    ElMessage.error(t('uploadSettings.saveFailed', { error: error.message }))
  }
}
</script>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.checkbox-item {
  flex-direction: row;
  align-items: center;
}

.theme-input {
  width: 100%;
}

.theme-checkbox {
  color: var(--el-text-color-regular);
}
</style>