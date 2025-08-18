import OSS from 'ali-oss'
import {OSSConfig, UploadOptions, UploadResult, IUploadService} from './types'
import UploadServiceError from './errors'
import {ISettingsManager} from '../settings/types'

export class UploadService implements IUploadService {
  private client: any = null
  private config: OSSConfig | null = null
  private settingsManager: ISettingsManager

  constructor(settingsManager: ISettingsManager) {
    this.settingsManager = settingsManager
    // 在构造时尝试初始化配置，但不阻塞构造函数
    this.initializeFromSettings().catch(error => {
      console.warn('UploadService: Failed to initialize during construction:', error)
    })
  }

  private async initializeFromSettings(): Promise<void> {
    try {
      const setting = await this.settingsManager.getSetting()
      if (setting.enabled && setting.config) {
        // 验证配置是否完整
        const requiredFields: (keyof OSSConfig)[] = ['region', 'accessKeyId', 'accessKeySecret', 'bucket', 'endpoint']
        const missingFields = requiredFields.filter(field => !setting.config[field])
        
        if (missingFields.length > 0) {
          console.warn(`OSS configuration missing required fields: ${missingFields.join(', ')}`)
          throw new UploadServiceError(`OSS configuration incomplete: missing ${missingFields.join(', ')}`, 'CONFIG_INCOMPLETE')
        }
        
        this.config = setting.config
        this.client = new OSS({
          region: setting.config.region,
          accessKeyId: setting.config.accessKeyId,
          accessKeySecret: setting.config.accessKeySecret,
          bucket: setting.config.bucket,
          endpoint: setting.config.endpoint,
          secure: setting.config.secure ?? true,
          cname: setting.config.cname ?? false
        })
        console.log('OSS client created successfully from settings')
      } else {
        console.warn('OSS setting is disabled or invalid')
        throw new UploadServiceError('OSS setting is disabled or invalid', 'SETTING_DISABLED')
      }
    } catch (error) {
      if (error instanceof UploadServiceError) {
        throw error
      }
      console.error('Failed to initialize OSS client from settings:', error)
      throw new UploadServiceError('Failed to initialize OSS client', 'INIT_FAILED')
    }
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    if (!this.client || !this.config) {
      await this.initializeFromSettings()
    }

    const { file, path = '', fileName, onProgress } = options
    
    // 生成文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || ''
    const finalFileName = fileName || `${timestamp}_${randomString}.${extension}`
    
    // 构建完整的对象路径
    const objectPath = path ? `${path}/${finalFileName}` : finalFileName

    try {
      // 上传文件
      const result = await this.client.put(objectPath, file, {
        progress: (p: number) => {
          if (onProgress) {
            onProgress(Math.round(p * 100))
          }
        }
      })

      if (!result.url) {
        throw new UploadServiceError('Upload failed: no URL returned', 'UPLOAD_FAILED')
      }

      // 生成签名URL用于显示，避免referer策略问题
      const displayUrl = this.client.signatureUrl(objectPath, {
        expires: 3600 * 24 // 24小时有效期，便于图片显示
      })

      return {
        url: result.url,
        displayUrl: displayUrl,
        name: finalFileName,
        size: file.size,
        type: file.type,
        path: objectPath
      }
    } catch (error: any) {
      console.error('Upload failed:', error)
      throw new UploadServiceError(
        error.message || 'Upload failed',
        error.code || 'UPLOAD_ERROR',
        error.requestId
      )
    }
  }

  async delete(objectPath: string): Promise<void> {
    if (!this.client) {
      await this.initializeFromSettings()
    }

    try {
      await this.client.delete(objectPath)
    } catch (error: any) {
      console.error('Delete failed:', error)
      throw new UploadServiceError(
        error.message || 'Delete failed',
        error.code || 'DELETE_ERROR',
        error.requestId
      )
    }
  }

  async getUrl(objectPath: string): Promise<string> {
    if (!this.client) {
      await this.initializeFromSettings()
    }

    try {
      const url = this.client.signatureUrl(objectPath, {
        expires: 3600 // 1小时有效期
      })
      return url
    } catch (error: any) {
      console.error('Get URL failed:', error)
      throw new UploadServiceError(
        error.message || 'Failed to get URL',
        error.code || 'GET_URL_ERROR',
        error.requestId
      )
    }
  }

  isInitialized(): boolean {
    console.log('UploadService is initialized:', this.client !== null && this.config !== null)
    return this.client !== null && this.config !== null
  }

  getConfig(): OSSConfig | null {
    return this.config
  }

  /**
   * 重新初始化上传服务
   * 在配置更新后调用此方法来重新加载配置
   */
  async reinitialize(): Promise<boolean> {
    try {
      // 清理现有状态
      this.client = null
      this.config = null
      
      // 重新初始化
      await this.initializeFromSettings()
      console.log('UploadService reinitialized successfully')
      return true
    } catch (error) {
      console.error('Failed to reinitialize UploadService:', error)
      return false
    }
  }
}

/**
 * 创建上传服务的工厂函数
 * @param settingsManager 设置管理器实例
 * @returns 上传服务实例
 */
export function createUploadService(
  settingsManager: ISettingsManager
): UploadService {
  return new UploadService(settingsManager);
}