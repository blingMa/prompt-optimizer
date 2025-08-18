import { UploadError } from './types'

export default class UploadServiceError extends Error implements UploadError {
  code: string
  requestId?: string

  constructor(message: string, code: string, requestId?: string) {
    super(message)
    this.name = 'UploadServiceError'
    this.code = code
    this.requestId = requestId
  }
}