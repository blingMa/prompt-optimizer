export interface OSSConfig {
  region: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  endpoint?: string
  secure?: boolean
  cname?: boolean
}

export interface UploadOptions {
  file: File
  path?: string
  fileName?: string
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  url: string
  displayUrl: string
  name: string
  size: number
  type: string
  path: string
}

export interface UploadError extends Error {
  code: string
  requestId?: string
}

export class UploadServiceError extends Error implements UploadError {
  code: string
  requestId?: string

  constructor(message: string, code: string, requestId?: string) {
    super(message)
    this.name = 'UploadServiceError'
    this.code = code
    this.requestId = requestId
  }
}

/**
 * 上传服务接口
 */
export interface IUploadService {
  upload(options: UploadOptions): Promise<UploadResult>
  delete(objectPath: string): Promise<void>
  getUrl(objectPath: string): Promise<string>
  isInitialized(): boolean
  getConfig(): OSSConfig | null
  reinitialize(): Promise<boolean>
}