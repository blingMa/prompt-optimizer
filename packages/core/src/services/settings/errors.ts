/**
 * 设置服务错误基类
 */
export class SettingsError extends Error {
  readonly code: string;
  readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'SettingsError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 设置配置验证错误
 */
export class SettingValidationError extends SettingsError {
  readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[]) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
    this.name = 'SettingValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * 设置未找到错误
 */
export class SettingNotFoundError extends SettingsError {
  readonly settingId: string;

  constructor(message: string, settingId: string) {
    super(message, 'NOT_FOUND', { settingId });
    this.name = 'SettingNotFoundError';
    this.settingId = settingId;
  }
}

/**
 * 设置测试错误
 */
export class SettingTestError extends SettingsError {
  readonly settingId: string;
  readonly testResult?: any;

  constructor(message: string, settingId: string, testResult?: any) {
    super(message, 'TEST_ERROR', { settingId, testResult });
    this.name = 'SettingTestError';
    this.settingId = settingId;
    this.testResult = testResult;
  }
}

/**
 * 设置存储错误
 */
export class SettingStorageError extends SettingsError {
  readonly operation: 'read' | 'write' | 'delete';
  readonly storageKey: string;

  constructor(message: string, operation: 'read' | 'write' | 'delete', storageKey: string) {
    super(message, 'STORAGE_ERROR', { operation, storageKey });
    this.name = 'SettingStorageError';
    this.operation = operation;
    this.storageKey = storageKey;
  }
}

/**
 * 设置导入导出错误
 */
export class SettingImportExportError extends SettingsError {
  readonly dataType: string;
  readonly originalError?: Error;

  constructor(message: string, dataType: string, originalError?: Error) {
    super(message, 'IMPORT_EXPORT_ERROR', { dataType, originalError: originalError?.message });
    this.name = 'SettingImportExportError';
    this.dataType = dataType;
    this.originalError = originalError;
  }
}