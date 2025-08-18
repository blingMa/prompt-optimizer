import { OSSConfig } from '../upload/types';
import { IImportExportable } from '../../interfaces/import-export';

/**
 * 设置配置类型
 */
export type SettingType = 'oss';

/**
 * 预定义 OSS 配置键
 */
export interface OSSSettingKeys {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
  secure: boolean;
  cname: boolean;
}

/**
 * 基础设置接口
 */
export interface BaseSetting {
  /** 设置ID */
  id: string;
  /** 设置类型 */
  type: SettingType;
  /** 设置名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * OSS 设置配置
 */
export interface OSSSetting extends BaseSetting {
  type: 'oss';
  /** OSS 配置 */
  config: OSSConfig;
  /** 最后测试时间 */
  lastTestedAt?: number;
  /** 测试状态 */
  testStatus?: 'success' | 'failed' | 'pending';
}

/**
 * 设置配置类型
 */
export type Setting = OSSSetting;

/**
 * 设置管理器接口
 */
export interface ISettingsManager extends IImportExportable {
  /**
   * 保存设置配置
   * @param setting 设置配置
   */
  saveSetting(setting: Setting): Promise<void>;

  /**
   * 获取设置配置
   * @returns 设置配置数组
   */
  getSettings(): Promise<Setting[]>;

  /**
   * 获取设置配置
   * @returns 设置配置
   */
  getSetting(): Promise<Setting>;

  /**
   * 更新设置配置
   * @param updates 更新内容
   */
  updateSetting(updates: Partial<OSSSettingKeys>): Promise<void>;

  /**
   * 测试设置配置
   * @returns 测试结果
   */
  testSetting(): Promise<boolean>;

  /**
   * 获取默认设置配置
   * @returns 默认设置配置
   */
  getDefaultSetting(): Promise<Setting>;

  /**
   * 重置为默认设置
   */
  resetToDefault(): Promise<void>;

  /**
   * 导出设置配置
   */
  exportData(): Promise<Setting[]>;

  /**
   * 导入设置配置
   */
  importData(data: any): Promise<void>;

  /**
   * 获取数据类型标识
   */
  getDataType(): Promise<string>;

  /**
   * 验证设置配置数据
   */
  validateData(data: any): Promise<boolean>;
}