<template>
  <ContentCardUI>
    <div class="flex flex-col h-full">
      <!-- Test Input Area -->
      <div class="flex-none">
        <!-- Show test input only for system prompt optimization -->
        <InputPanelUI
          v-if="optimizationMode === 'system'"
          v-model="testContent"
          v-model:selectedModel="selectedTestModel"
          :label="t('test.content')"
          :placeholder="t('test.placeholder')"
          :model-label="t('test.model')"
          :button-text="isCompareMode ? t('test.startCompare') : t('test.startTest')"
          :loading-text="t('test.testing')"
          :loading="isTesting"
          :disabled="isTesting"
          @submit="handleTest"
          @configModel="$emit('showConfig')"
        >
          <template #model-select>
            <ModelSelectUI
              ref="testModelSelect"
              :modelValue="selectedTestModel"
              @update:modelValue="updateSelectedModel"
              :disabled="isTesting"
              @config="$emit('showConfig')"
            />
          </template>
          <template #control-buttons>
            <div class="flex-1">
              <div class="h-[20px] mb-1.5"><!-- 占位，与其他元素对齐 --></div>
              <div class="flex items-center gap-2">
                <button
                  @click="isCompareMode = !isCompareMode"
                  class="h-10 text-sm whitespace-nowrap"
                  :class="isCompareMode ? 'theme-button-primary' : 'theme-button-secondary'"
                >
                  {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
                </button>
              </div>
            </div>
          </template>
        </InputPanelUI>

        <!-- 图片上传区域 - 系统提示词优化模式 -->
        <div v-if="optimizationMode === 'system'" class="mt-4">
          <div v-if="uploadInitialized">
            <ImageUpload
              :upload-service="uploadService"
              :disabled="isTesting"
              :max-files="5"
              :max-size="10 * 1024 * 1024"
              :upload-path="'test-images'"
              @file-change="handleImagesChange"
              @upload-success="handleUploadSuccess"
              @upload-error="handleUploadError"
            />
          </div>
          <div v-else class="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            <p>图片上传功能未配置</p>
            <p class="text-sm">请在设置中添加 OSS 配置以启用图片上传功能</p>
          </div>
        </div>

        <!-- For user prompt optimization, show simplified test controls -->
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium theme-text">{{ t('test.userPromptTest') }}</h3>
            <div class="flex items-center gap-2">
              <ModelSelectUI
                ref="testModelSelect"
                :modelValue="selectedTestModel"
                @update:modelValue="updateSelectedModel"
                :disabled="isTesting"
                @config="$emit('showConfig')"
                class="w-56"
              />
              <button
                @click="isCompareMode = !isCompareMode"
                class="h-10 text-sm whitespace-nowrap"
                :class="isCompareMode ? 'theme-button-primary' : 'theme-button-secondary'"
              >
                {{ isCompareMode ? t('test.toggleCompare.disable') : t('test.toggleCompare.enable') }}
              </button>
              <button
                @click="handleTest"
                :disabled="isTesting || !selectedTestModel"
                class="h-10 px-4 text-sm font-medium theme-button-primary"
              >
                {{ isTesting ? t('test.testing') : (isCompareMode ? t('test.startCompare') : t('test.startTest')) }}
              </button>
              <button
                v-if="isTesting"
                @click="handleStopTest"
                class="h-10 px-4 text-sm font-medium theme-button-secondary ml-2"
              >
                {{ t('test.stopTest') }}
              </button>
            </div>
          </div>
          
          <!-- 图片上传区域 - 用户提示词优化模式 -->
          <div v-if="uploadInitialized">
            <ImageUpload
              :upload-service="uploadService"
              :disabled="isTesting"
              :max-files="5"
              :max-size="10 * 1024 * 1024"
              :upload-path="'test-images'"
              @file-change="handleImagesChange"
              @upload-success="handleUploadSuccess"
              @upload-error="handleUploadError"
            />
          </div>
          <div v-else class="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            <p>图片上传功能未配置</p>
            <p class="text-sm">请在设置中添加 OSS 配置以启用图片上传功能</p>
          </div>
        </div>
      </div>

      <!-- Test Results Area -->
      <div class="flex-1 min-h-0 md:overflow-hidden overflow-visible mt-5">
        <div class="relative h-full flex flex-col md:block">
          <!-- Original Prompt Test Result -->
          <div
            v-show="isCompareMode"
            class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px] mb-4 md:mb-0 md:absolute md:inset-0 md:h-full md:w-[calc(50%-6px)] md:mr-3"
            :style="{
              height: isCompareMode ? 'auto' : '0',
              opacity: isCompareMode ? 1 : 0,
              pointerEvents: isCompareMode ? 'auto' : 'none'
            }"
          >
            <h3 class="text-lg font-semibold theme-text truncate mb-3 flex-none flex items-center gap-2">
              {{ t('test.originalResult') }}
              <el-tooltip
                v-if="true"
                :content="t('test.tokensTooltip', { 
                  tokens: originalTestTokens, 
                  inputTokens: originalTestInputTokens, 
                  outputTokens: originalTestOutputTokens 
                })"
                placement="top"
                :show-after="500"
              >
                <button class="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors theme-button-primary">
                  {{ originalTestTokens || 0 }} tokens
                </button>
              </el-tooltip>
            </h3>
            <OutputDisplay
              :content="originalTestResult"
              :reasoning="originalTestReasoning"
              :streaming="isTestingOriginal"
              :enableDiff="false"
              mode="readonly"
              class="flex-1 min-h-0"
            />
          </div>

          <!-- Optimized Prompt Test Result -->
          <div
            class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px]"
            :style="{
              height: isCompareMode ? 'auto' : '100%'
            }"
            :class="{
              'md:absolute md:inset-0 md:h-full md:w-[calc(50%-6px)] md:left-[calc(50%+6px)]': isCompareMode,
              'md:absolute md:inset-0 md:h-full md:w-full md:left-0': !isCompareMode
            }"
          >
            <h3 class="text-lg font-semibold theme-text truncate mb-3 flex-none flex items-center gap-2">
              {{ isCompareMode ? t('test.optimizedResult') : t('test.testResult') }}
              <el-tooltip
                v-if="true"
                :content="t('test.tokensTooltip', { 
                  tokens: optimizedTestTokens, 
                  inputTokens: optimizedTestInputTokens, 
                  outputTokens: optimizedTestOutputTokens 
                })"
                placement="top"
                :show-after="500"
              >
                <button class="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors theme-button-primary">
                  {{ optimizedTestTokens || 0 }} tokens
                </button>
              </el-tooltip>
            </h3>
            <OutputDisplay
              :content="optimizedTestResult"
              :reasoning="optimizedTestReasoning"
              :streaming="isTestingOptimized"
              :enableDiff="false"
              mode="readonly"
              class="flex-1 min-h-0"
            />
          </div>
        </div>
      </div>
    </div>
  </ContentCardUI>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '../composables/useToast'
import { ElTooltip } from 'element-plus'
import ContentCardUI from './ContentCard.vue'
import InputPanelUI from './InputPanel.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputDisplay from './OutputDisplay.vue'
import ImageUpload from './ImageUpload.vue'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  promptService: {
    type: [Object, null],
    required: true
  },
  llmService: {
    type: Object,
    default: null
  },
  uploadService: {
    type: Object,
    default: null
  },
  originalPrompt: {
    type: String,
    default: ''
  },
  optimizedPrompt: {
    type: String,
    default: ''
  },
  modelValue: {
    type: String,
    default: ''
  },
  optimizationMode: {
    type: String,
    default: 'system'
  }
})

const emit = defineEmits(['showConfig', 'update:modelValue', 'images-change'])

const isCompareMode = ref(true)
const testModelSelect = ref(null)
const selectedTestModel = ref(props.modelValue || '')
const uploadedImages = ref([])
const uploadInitialized = ref(false)

// 监听对比模式变化，在切换时清理状态
watch(isCompareMode, (newValue, oldValue) => {
  // 跳过初始化时的变化
  if (oldValue === undefined) return
  
  // 如果正在测试，先停止当前测试
  if (isTesting.value && abortController.value) {
    abortController.value.abort()

    // 重置测试状态
    isTestingOriginal.value = false
    isTestingOptimized.value = false
    abortController.value = null
    
    toast.info(t('test.stopped'))
  }
})

const handleImagesChange = (images) => {
  uploadedImages.value = images
  emit('images-change', images)
}

watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== selectedTestModel.value) {
    selectedTestModel.value = newVal
  }
})

// 计算属性来跟踪uploadService的初始化状态
const isUploadServiceInitialized = computed(() => {
  return props.uploadService ? props.uploadService.isInitialized() : false
})

// 监控uploadService的变化
watch(() => props.uploadService, (newUploadService) => {
}, {immediate: true})

// 监控uploadService初始化状态的变化
watch(isUploadServiceInitialized, (isInitialized) => {
}, {immediate: true})

const updateSelectedModel = (value) => {
  selectedTestModel.value = value
  emit('update:modelValue', value)
}

const originalTestResult = ref('')
const originalTestError = ref('')
const isTestingOriginal = ref(false)

// 添加推理内容状态
const originalTestReasoning = ref('')

// 添加 tokens 消耗量状态
const originalTestTokens = ref(0)
const originalTestInputTokens = ref(0)
const originalTestOutputTokens = ref(0)

const optimizedTestResult = ref('')
const optimizedTestError = ref('')
const isTestingOptimized = ref(false)

// 添加推理内容状态
const optimizedTestReasoning = ref('')

// 添加 tokens 消耗量状态
const optimizedTestTokens = ref(0)
const optimizedTestInputTokens = ref(0)
const optimizedTestOutputTokens = ref(0)

const isTesting = computed(() => isTestingOriginal.value || isTestingOptimized.value)
const testContent = ref('')

// 中断控制器
const abortController = ref(null)

const ensureString = (value) => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

const testOriginalPrompt = async (signal) => {
  if (!props.originalPrompt) return

  isTestingOriginal.value = true
  originalTestResult.value = ''
  originalTestError.value = ''
  originalTestReasoning.value = ''
  originalTestTokens.value = 0
  originalTestInputTokens.value = 0
  originalTestOutputTokens.value = 0
  
  await nextTick(); // 确保状态更新和DOM清空完成

  try {
    // 使用传入的中断信号
    // 如果已经中断，立即抛出错误
    if (signal?.aborted) {
      throw new Error('Test aborted')
    }
    
    const streamHandler = {
      onToken: (token) => {
        if (signal?.aborted) {
          throw new Error('Test aborted')
        }
        originalTestResult.value += token
      },
      onReasoningToken: (reasoningToken) => {
        if (signal?.aborted) {
          throw new Error('Test aborted')
        }
        originalTestReasoning.value += reasoningToken
      },
      onComplete: (response) => { 
        /* 流结束后不再需要设置 isTesting, 由 finally 处理 */
        if (response?.metadata?.tokens) {
          originalTestTokens.value = response.metadata.tokens
          originalTestInputTokens.value = response.metadata.inputTokens || 0
          originalTestOutputTokens.value = response.metadata.outputTokens || 0
        }
      },
      onError: (err) => {
        if (signal?.aborted) return
        const errorMessage = err.message || t('test.error.failed')
        originalTestError.value = errorMessage
        toast.error(errorMessage)
      }
    }

    let systemPrompt = ''
    let userPromptObj = {}

    if (props.optimizationMode === 'user') {
      systemPrompt = ''
      userPromptObj = buildPromptWithImages(ensureString(props.originalPrompt))
    } else {
      systemPrompt = ensureString(props.originalPrompt)
      userPromptObj = buildPromptWithImages(testContent.value)
    }
    // 检查多模态支持（仅在有图片时检查）
    if (userPromptObj.images && userPromptObj.images.length > 0) {
      const isSupported = await checkMultimodalSupport(selectedTestModel.value)
      if (!isSupported) {
        // const warningMessage = t('test.multimodalNotSupported', { model: selectedTestModel.value })
        // toast.warning(warningMessage)
        // console.warn(warningMessage)
      }
    }

    await props.promptService.testPromptStream(
      systemPrompt,
      userPromptObj.text,
      selectedTestModel.value,
      streamHandler,
      userPromptObj.images || [], // 确保传递空数组而不是 undefined
      signal // 传递中断信号
    )
  } catch (error) {
    if (signal?.aborted || error.message === 'Test aborted') {
      console.log('[TestPanel] Original prompt test aborted')
      throw error // 重新抛出中断错误，让调用者处理
    }
    console.error('[TestPanel] Original prompt test failed:', error); // 增加详细错误日志
    const errorMessage = error.message || t('test.error.failed')
    originalTestError.value = errorMessage
    toast.error(errorMessage)
    originalTestResult.value = ''
  } finally {
    // 确保无论成功或失败，加载状态最终都会被关闭
    isTestingOriginal.value = false
    // 注意：不在这里清理 abortController，让 handleTest 统一处理
  }
}

const testOptimizedPrompt = async (signal) => {
  if (!props.optimizedPrompt) return

  isTestingOptimized.value = true
  optimizedTestResult.value = ''
  optimizedTestError.value = ''
  optimizedTestReasoning.value = ''
  optimizedTestTokens.value = 0
  optimizedTestInputTokens.value = 0
  optimizedTestOutputTokens.value = 0
  
  await nextTick(); // 确保状态更新和DOM清空完成

  try {
    // 使用传入的中断信号
    // 如果已经中断，立即抛出错误
    if (signal?.aborted) {
      throw new Error('Test aborted')
    }
    
    const streamHandler = {
      onToken: (token) => {
        if (signal?.aborted) {
          throw new Error('Test aborted')
        }
        optimizedTestResult.value += token
      },
      onReasoningToken: (reasoningToken) => {
        if (signal?.aborted) {
          throw new Error('Test aborted')
        }
        optimizedTestReasoning.value += reasoningToken
      },
      onComplete: (response) => { 
        /* 流结束后不再需要设置 isTesting, 由 finally 处理 */
        console.log('[TestPanel] 优化测试收到 onComplete 响应:', response);
        if (response?.metadata?.tokens) {
          optimizedTestTokens.value = response.metadata.tokens
          optimizedTestInputTokens.value = response.metadata.inputTokens || 0
          optimizedTestOutputTokens.value = response.metadata.outputTokens || 0
        }
      },
      onError: (err) => {
        if (signal?.aborted) return
        const errorMessage = err.message || t('test.error.failed')
        optimizedTestError.value = errorMessage
        toast.error(errorMessage)
      }
    }

    let systemPrompt = ''
    let userPromptObj = {}

    if (props.optimizationMode === 'user') {
      systemPrompt = ''
      userPromptObj = buildPromptWithImages(ensureString(props.optimizedPrompt))
    } else {
      systemPrompt = ensureString(props.optimizedPrompt)
      userPromptObj = buildPromptWithImages(testContent.value)
    }

    // 检查多模态支持（仅在有图片时检查）
    if (userPromptObj.images && userPromptObj.images.length > 0) {
      const isSupported = await checkMultimodalSupport(selectedTestModel.value)
      // if (!isSupported) {
      //   const warningMessage = t('test.multimodalNotSupported', { model: selectedTestModel.value })
      //   toast.warning(warningMessage)
      //   console.warn(warningMessage)
      // }
    }

    await props.promptService.testPromptStream(
      systemPrompt,
      userPromptObj.text,
      selectedTestModel.value,
      streamHandler,
      userPromptObj.images || [], // 确保传递空数组而不是 undefined
      signal // 传递中断信号
    )
  } catch (error) {
    if (signal?.aborted || error.message === 'Test aborted') {
      console.log('[TestPanel] Optimized prompt test aborted')
      throw error // 重新抛出中断错误，让调用者处理
    }
    console.error('[TestPanel] Optimized prompt test failed:', error); // 增加详细错误日志
    const errorMessage = error.message || t('test.error.failed')
    optimizedTestError.value = errorMessage
    toast.error(errorMessage)
    optimizedTestResult.value = ''
  } finally {
    // 确保无论成功或失败，加载状态最终都会被关闭
    isTestingOptimized.value = false
    // 注意：不在这里清理 abortController，让 handleTest 统一处理
  }
}

const handleStopTest = () => {
  if (abortController.value) {
    abortController.value.abort()

    // 稍微延迟重置状态，让测试函数有时间处理中断
    setTimeout(() => {
      isTestingOriginal.value = false
      isTestingOptimized.value = false
      abortController.value = null
    }, 50)
    
    // 显示停止消息
    toast.info(t('test.stopped'))
  }
}

const handleTest = async () => {
  // 如果已经有活跃的测试，先停止它
  if (isTesting.value && abortController.value) {
    abortController.value.abort()

    // 等待状态清理
    await new Promise(resolve => setTimeout(resolve, 100))
    
    isTestingOriginal.value = false
    isTestingOptimized.value = false
    abortController.value = null
  }
  
  if (!selectedTestModel.value) {
    toast.error(t('test.error.noModel'))
    return
  }

  // For user prompt optimization, we don't need test content input
  // For system prompt optimization, we need test content input
  if (props.optimizationMode === 'system' && !testContent.value) {
    toast.error(t('test.error.noTestContent'))
    return
  }

  if (isCompareMode.value) {
    // Compare test mode: test both original and optimized prompts
    try {
      // 创建共享的中断控制器
      abortController.value = new AbortController()
      const sharedSignal = abortController.value.signal
      
      // 并行执行测试，但使用共享的中断信号
      const originalTestPromise = testOriginalPrompt(sharedSignal)
      const optimizedTestPromise = testOptimizedPrompt(sharedSignal)
      
      // 使用 Promise.allSettled 来捕获所有结果，但添加超时和中断检查
      const timeoutPromise = new Promise((_, reject) => {
        sharedSignal.addEventListener('abort', () => {
          reject(new Error('Test aborted'))
        })
      })
      
      try {
        const results = await Promise.race([
          Promise.allSettled([originalTestPromise, optimizedTestPromise]),
          timeoutPromise
        ])
        
        // 如果到这里说明测试正常完成
        // 处理测试结果
        if (Array.isArray(results)) {
          results.forEach((result, index) => {
            if (result.status === 'rejected' && result.reason) {
              const isOriginal = index === 0
              const errorMessage = result.reason.message || t('test.error.failed')
              
              if (isOriginal) {
                originalTestError.value = errorMessage
              } else {
                optimizedTestError.value = errorMessage
              }
              toast.error(errorMessage)
            }
          })
        }
      } catch (error) {
        if (error.message === 'Test aborted') {
          console.log('[TestPanel] Compare test aborted by user')
          // 确保清理状态
          abortController.value = null
          return
        }
        throw error
      }
      
      // 测试完成后清理中断控制器
      abortController.value = null
    } catch (error) {
      console.error('[TestPanel] Test process error:', error)
      // 确保异常情况下也清理状态
      abortController.value = null
    }
  } else {
    // Normal test mode: only test optimized prompt
    try {
      abortController.value = new AbortController()
      await testOptimizedPrompt(abortController.value.signal)
    } catch (error) {
      console.error('[TestPanel] Normal test error:', error)
    } finally {
      // 确保无论成功或失败都清理状态
      abortController.value = null
    }
  }
}

const handleUploadSuccess = (result) => {
  toast.success(t('upload.success', { fileName: result.name }))
}

const handleUploadError = (error) => {
  toast.error(t('upload.failed', { error: error.message }))
}

const buildPromptWithImages = (basePrompt) => {

  if (!uploadedImages.value || uploadedImages.value.length === 0) {
    const result = {
      text: basePrompt,
      images: []
    };
    return result;
  }

  const images = uploadedImages.value.map(img => ({
    url: img.url,
    name: img.name
  }))

  const result = {
    text: basePrompt,
    images
  };
  return result;
}

// 检查当前模型是否支持多模态
const checkMultimodalSupport = async (modelKey) => {
  if (!props.llmService) {
    return false
  }
  
  try {
    return await props.llmService.supportsMultimodal(modelKey)
  } catch (error) {
    console.warn('Failed to check multimodal support:', error)
    return false
  }
}

onMounted(() => {
  if (props.modelValue) {
    selectedTestModel.value = props.modelValue
  }
  
  // 调试上传服务
  setTimeout(() => {
    uploadInitialized.value = props.uploadService ? props.uploadService.isInitialized() : false
  }, 1000)
})

// 组件卸载时清理状态
onUnmounted(() => {
  if (abortController.value) {
    abortController.value.abort()
    console.log('[TestPanel] Cleaning up on unmount')
  }
  isTestingOriginal.value = false
  isTestingOptimized.value = false
  abortController.value = null
})
</script>

<style scoped>
.theme-checkbox {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
}
/* 小屏幕下允许容器自由扩展 */
@media (max-width: 767px) {
  .min-h-\[80px\] {
    min-height: 120px !important; /* 增加小屏幕下的最小高度 */
  }
  
  /* 确保OutputPanel可以正确扩展 */
  .flex-1 {
    flex: 1 0 auto;
  }
}
</style>