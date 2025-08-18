<template>
  <div class="w-full theme-input resize-none">
    <div
      class="upload-area"
      :class="{
        'drag-over': isDragOver,
        'uploading': isUploading,
        'disabled': disabled
      }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="handleClick"
    >
      <div class="upload-content">
        <div class="upload-icon">
          <el-icon v-if="!isUploading"><Upload /></el-icon>
          <el-icon v-else class="loading"><Loading /></el-icon>
        </div>
        <div class="upload-text">
          <div v-if="!isUploading" class="primary-text">
            {{ t('upload.dragDrop') }}
          </div>
          <div v-if="!isUploading" class="secondary-text">
            {{ t('upload.orClick') }}
          </div>
          <div v-else class="uploading-text">
            {{ t('upload.uploading') }} {{ uploadProgress }}%
          </div>
        </div>
      </div>
      
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        @change="handleFileSelect"
        class="file-input"
      />
    </div>

    <div v-if="uploadedFiles.length > 0" class="uploaded-files">
      <div v-for="file in uploadedFiles" :key="file.url" class="file-item">
        <div class="file-preview" @click="handlePreview(file)">
          <img :src="file.displayUrl" :alt="file.name" />
          <div class="file-overlay">
            <button @click.stop="handlePreview(file)" class="overlay-btn preview-btn" :title="t('upload.preview')">
              <span class="icon-text">👁</span>
            </button>
            <button @click.stop="handleDelete(file)" class="overlay-btn delete-btn" :title="t('upload.delete')">
              <span class="icon-text">✕</span>
            </button>
          </div>
        </div>
        <div class="file-name" :title="file.name">{{ file.name }}</div>
      </div>
    </div>

    <!-- 图片预览遮罩层 -->
    <div v-if="previewVisible" class="preview-overlay" @click="closePreview">
      <div class="preview-content" @click.stop>
        <div class="preview-header">
          <div class="preview-title">{{ previewFile?.name }}</div>
          <button @click="closePreview" class="close-btn" :title="t('upload.close')">
            <span class="icon-text">✕</span>
          </button>
        </div>
        <div class="preview-container">
          <img :src="previewFile?.displayUrl" :alt="previewFile?.name" class="preview-image" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Upload, Loading, CopyDocument, Close } from '@element-plus/icons-vue'

const { t } = useI18n()

const props = defineProps({
  uploadService: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  maxFiles: {
    type: Number,
    default: 10
  },
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  allowedTypes: {
    type: Array,
    default: () => ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  uploadPath: {
    type: String,
    default: 'uploads'
  }
})

const emit = defineEmits(['upload-success', 'upload-error', 'delete', 'file-change'])

const fileInput = ref(null)
const isDragOver = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadedFiles = ref([])
const previewVisible = ref(false)
const previewFile = ref(null)

const handleClick = () => {
  if (props.disabled || isUploading.value) return
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  processFiles(files)
  event.target.value = '' // 清空input以便重复选择同一文件
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragOver.value = false
  
  if (props.disabled || isUploading.value) return
  
  const files = Array.from(event.dataTransfer.files).filter(file => 
    props.allowedTypes.includes(file.type)
  )
  
  processFiles(files)
}

const handleDragOver = (event) => {
  event.preventDefault()
  if (!props.disabled && !isUploading.value) {
    isDragOver.value = true
  }
}

const handleDragLeave = (event) => {
  event.preventDefault()
  isDragOver.value = false
}

const processFiles = (files) => {
  const validFiles = files.filter(file => {
    if (!props.allowedTypes.includes(file.type)) {
      ElMessage.error(t('upload.invalidType', { fileName: file.name }))
      return false
    }
    
    if (file.size > props.maxSize) {
      ElMessage.error(t('upload.fileTooLarge', { fileName: file.name }))
      return false
    }
    
    return true
  })

  if (uploadedFiles.value.length + validFiles.length > props.maxFiles) {
    ElMessage.error(t('upload.tooManyFiles', { max: props.maxFiles }))
    return
  }

  validFiles.forEach(file => uploadFile(file))
}

const uploadFile = async (file) => {
  if (!props.uploadService.isInitialized()) {
    ElMessage.error(t('upload.serviceNotInitialized'))
    return
  }

  isUploading.value = true
  uploadProgress.value = 0

  try {
    const result = await props.uploadService.upload({
      file,
      path: props.uploadPath,
      onProgress: (progress) => {
        uploadProgress.value = progress
      }
    })

    uploadedFiles.value.push(result)
    emit('upload-success', result)
    emit('file-change', uploadedFiles.value)
    
    ElMessage.success(t('upload.success', { fileName: file.name }))
  } catch (error) {
    console.error('Upload failed:', error)
    emit('upload-error', error)
    ElMessage.error(t('upload.failed', { fileName: file.name, error: error.message }))
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const handlePreview = (file) => {
  previewFile.value = file
  previewVisible.value = true
}

const closePreview = () => {
  previewVisible.value = false
  previewFile.value = null
}

const handleDelete = async (file) => {
  try {
    await props.uploadService.delete(file.path)
    uploadedFiles.value = uploadedFiles.value.filter(f => f.url !== file.url)
    emit('delete', file)
    emit('file-change', uploadedFiles.value)
    ElMessage.success(t('upload.deleteSuccess', { fileName: file.name }))
  } catch (error) {
    console.error('Delete failed:', error)
    ElMessage.error(t('upload.deleteFailed', { fileName: file.name }))
  }
}

// 暴露方法供父组件调用
defineExpose({
  uploadedFiles,
  clearFiles: () => {
    uploadedFiles.value = []
    emit('file-change', [])
  }
})
</script>

<style scoped>

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 0;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.upload-area.drag-over {
  border-color: var(--el-color-primary);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 4px var(--el-color-primary-light-8);
  transform: scale(1.01);
}

.upload-area.uploading {
  cursor: not-allowed;
  opacity: 0.8;
}

.upload-area.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 32px;
  color: var(--el-text-color-secondary);
}

.upload-icon.loading {
  color: var(--el-color-primary);
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.primary-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-placeholder);
}

.secondary-text {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.uploading-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-color-primary);
}

.file-input {
  display: none;
}

.uploaded-files {
  margin-top: 3px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 60px;
}

.file-preview {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 1px solid var(--border-color);
  background: var(--el-fill-color-blank);
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.file-preview:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px var(--el-color-info), 0 0 0 2px var(--el-color-primary-light-9);
  transform: translateY(-1px);
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-preview:hover .file-overlay {
  opacity: 1;
}

.overlay-btn {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--el-color-info);
  box-shadow: 0 2px 4px var(--el-color-info);
}

.overlay-btn:hover {
  background: #fff;
  transform: scale(1.1);
  box-shadow: 0 4px 8px var(--el-color-info), 0 0 0 1px var(--el-color-primary);
}

.overlay-btn .el-icon,
.overlay-btn .icon-text {
  font-size: 14px;
  font-weight: bold;
  display: flex !important;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.preview-btn:hover,
.preview-btn:hover .icon-text {
  color: var(--el-color-primary);
}

.delete-btn:hover,
.delete-btn:hover .icon-text {
  color: var(--el-color-danger);
}

.file-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.preview-content {
  background: var(--el-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px var(--el-color-info);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--el-fill-color-blank);
}

.preview-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--el-text-color-secondary);
}

.close-btn:hover {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  transform: scale(1.1);
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  min-height: 400px;
  flex: 1;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 24px var(--el-color-info), 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>