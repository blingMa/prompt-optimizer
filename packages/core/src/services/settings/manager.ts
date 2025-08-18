import {ISettingsManager, OSSSetting, OSSSettingKeys, Setting} from './types';
import {IStorageProvider} from '../storage/types';
import {StorageAdapter} from '../storage/adapter';
import {
  SettingImportExportError,
  SettingNotFoundError,
  SettingsError,
  SettingStorageError,
  SettingTestError,
  SettingValidationError
} from './errors';
import {createUploadService} from '../upload/service';
import {CORE_SERVICE_KEYS} from '../../constants/storage-keys';
import {v4 as uuidv4} from 'uuid';

/**
 * Settings Manager implementation - simplified for OSS configuration only
 */
export class SettingsManager implements ISettingsManager {
  private readonly storageKey = CORE_SERVICE_KEYS.SETTINGS;
  private readonly storage: StorageAdapter;

  constructor(storageProvider: IStorageProvider) {
    this.storage = new StorageAdapter(storageProvider);
  }

  /**
   * 保存设置配置
   */
  async saveSetting(setting: Setting): Promise<void> {
    try {
      this.validateSetting(setting);
      
      // 设置时间戳
      setting.updatedAt = Date.now();

      // 直接保存，只允许一个OSS配置
      await this.storage.setItem(this.storageKey, JSON.stringify([setting]));
    } catch (err: any) {
      if (err instanceof SettingsError) {
        throw err;
      }
      throw new SettingStorageError('Failed to save settings', 'write', this.storageKey);
    }
  }

  /**
   * 获取设置配置
   */
  async getSettings(): Promise<Setting[]> {
    try {
      const data = await this.storage.getItem(this.storageKey);
      if (!data) return [];
      
      const settings: Setting[] = JSON.parse(data);
      return settings;
    } catch (err) {
      throw new SettingStorageError('Failed to get settings', 'read', this.storageKey);
    }
  }

  /**
   * 获取设置配置
   */
  async getSetting(): Promise<Setting> {
    const settings = await this.getSettings();
    if (settings.length === 0) {
      throw new SettingNotFoundError('OSS setting not found', 'oss');
    }
    
    return settings[0];
  }

  /**
   * 更新设置配置
   */
  async updateSetting(updates: Partial<OSSSettingKeys>): Promise<void> {
    try {
      await this.storage.updateData<Setting[]>(
        this.storageKey,
        (existingSettings: Setting[] | null) => {
          const settings = existingSettings || [];
          
          // 如果没有现有配置，创建默认配置
          if (settings.length === 0) {
            const defaultSetting = this.createDefaultSetting();
            settings[0] = {
              ...defaultSetting,
              enabled: true, // 启用新创建的设置
              config: {
                ...defaultSetting.config,
                ...updates
              },
              updatedAt: Date.now()
            } as Setting;
            return settings;
          }
          
          const currentSetting = settings[0];
          
          // 验证更新内容
          this.validateOSSConfig(updates);
          
          // 更新配置
          settings[0] = {
            ...currentSetting,
            enabled: true, // 启用已更新的设置
            config: {
              ...currentSetting.config,
              ...updates
            },
            updatedAt: Date.now()
          } as Setting;
          
          return settings;
        }
      );
    } catch (err: any) {
      console.error('[SettingsManager] Error in updateSetting:', err);
      console.error('[SettingsManager] Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        code: err.code
      });
      
      if (err instanceof SettingNotFoundError || err instanceof SettingsError) {
        throw err;
      }
      throw new SettingStorageError('Failed to update setting', 'write', this.storageKey);
    }
  }

  /**
   * 测试设置配置
   */
  async testSetting(): Promise<boolean> {
    try {
      await this.getSetting(); // 确保设置存在
      const uploadService = createUploadService(this);
      
      try {
        const isInitialized = uploadService.isInitialized();
        if (!isInitialized) {
          throw new Error('Upload service not initialized');
        }
        
        // 更新测试状态
        await this.storage.updateData<Setting[]>(
          this.storageKey,
          (existingSettings: Setting[] | null) => {
            const settings = existingSettings || [];
            if (settings.length === 0) {
              throw new SettingNotFoundError('OSS setting not found', 'oss');
            }
            
            settings[0] = {
              ...settings[0],
              lastTestedAt: Date.now(),
              testStatus: 'success',
              updatedAt: Date.now()
            } as Setting;
            
            return settings;
          }
        );
        
        return true;
      } catch (testError: any) {
        // 更新测试状态为失败
        await this.storage.updateData<Setting[]>(
          this.storageKey,
          (existingSettings: Setting[] | null) => {
            const settings = existingSettings || [];
            if (settings.length === 0) {
              throw new SettingNotFoundError('OSS setting not found', 'oss');
            }
            
            settings[0] = {
              ...settings[0],
              lastTestedAt: Date.now(),
              testStatus: 'failed',
              updatedAt: Date.now()
            } as Setting;
            
            return settings;
          }
        );
        
        throw new SettingTestError(
          `OSS setting test failed: ${testError.message}`,
          'oss',
          testError
        );
      }
    } catch (err: any) {
      if (err instanceof SettingTestError) {
        throw err;
      }
      throw new SettingTestError(`Setting test failed: ${err.message}`, 'oss', err);
    }
  }

  /**
   * 创建默认设置配置（同步方法）
   */
  private createDefaultSetting(): Setting {
    const now = Date.now();
    
    return {
      id: uuidv4(),
      type: 'oss',
      name: 'Default OSS Setting',
      description: 'Default OSS upload configuration',
      enabled: false,
      config: {
        region: '',
        accessKeyId: '',
        accessKeySecret: '',
        bucket: '',
        endpoint: '',
        secure: true,
        cname: false
      },
      createdAt: now,
      updatedAt: now
    } as OSSSetting;
  }

  /**
   * 获取默认设置配置
   */
  async getDefaultSetting(): Promise<Setting> {
    return this.createDefaultSetting();
  }

  /**
   * 重置为默认设置
   */
  async resetToDefault(): Promise<void> {
    const defaultSetting = await this.getDefaultSetting();
    await this.saveSetting(defaultSetting);
  }

  /**
   * 验证设置配置
   */
  private validateSetting(setting: Setting): void {
    const errors: string[] = [];
    
    if (setting.type !== 'oss') errors.push('Only OSS settings are supported');
    if (!setting.name) errors.push('Name is required');
    // 验证 OSS 配置
    if (!setting.config) errors.push('OSS config is required');
    if (!setting.config.region) errors.push('OSS region is required');
    if (!setting.config.accessKeyId) errors.push('OSS access key ID is required');
    if (!setting.config.accessKeySecret) errors.push('OSS access key secret is required');
    if (!setting.config.bucket) errors.push('OSS bucket is required');
    
    if (errors.length > 0) {
      throw new SettingValidationError('Setting validation failed', errors);
    }
  }

  /**
   * 验证 OSS 配置更新
   */
  private validateOSSConfig(config: Partial<OSSSettingKeys>): void {
    const validKeys = ['region', 'accessKeyId', 'accessKeySecret', 'bucket', 'endpoint', 'secure', 'cname'];
    const invalidKeys = Object.keys(config).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      throw new SettingValidationError('Invalid OSS configuration keys', invalidKeys);
    }
  }

  // 实现 IImportExportable 接口

  /**
   * 导出设置配置
   */
  async exportData(): Promise<Setting[]> {
    try {
      return await this.getSettings();
    } catch (error) {
      throw new SettingImportExportError(
        'Failed to export settings data',
        await this.getDataType(),
        error as Error
      );
    }
  }

  /**
   * 导入设置配置
   */
  async importData(data: any): Promise<void> {
    if (!(await this.validateData(data))) {
      throw new Error('Invalid settings data format: data must be an OSS setting');
    }

    const settings = data as Setting[];
    if (settings.length === 0) return;
    
    // 只导入第一个 OSS 设置
    try {
      await this.saveSetting(settings[0]);
    } catch (error) {
      console.warn('Failed to import setting:', error);
      throw new SettingImportExportError(
        'Failed to import settings data',
        await this.getDataType(),
        error as Error
      );
    }
  }

  /**
   * 获取数据类型标识
   */
  async getDataType(): Promise<string> {
    return 'oss-settings';
  }

  /**
   * 验证设置配置数据格式
   */
  async validateData(data: any): Promise<boolean> {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    return data.every(item =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      item.type === 'oss' &&
      typeof item.name === 'string' &&
      typeof item.enabled === 'boolean' &&
      typeof item.createdAt === 'number' &&
      typeof item.updatedAt === 'number' &&
      typeof item.config === 'object'
    );
  }
}

/**
 * 创建设置管理器的工厂函数
 * @param storageProvider 存储提供器实例
 * @returns 设置管理器实例
 */
export function createSettingsManager(
  storageProvider: IStorageProvider
): SettingsManager {
  return new SettingsManager(storageProvider);
}