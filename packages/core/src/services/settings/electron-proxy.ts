import { ISettingsManager, Setting, OSSSettingKeys } from './types';
import { safeSerializeForIPC } from '../../utils/ipc-serialization';

/**
 * Electron环境下的设置管理器代理
 * 通过IPC调用主进程中的真实SettingsManager实例
 */
export class ElectronSettingsManagerProxy implements ISettingsManager {
  private electronAPI: NonNullable<Window['electronAPI']>;

  constructor() {
    // 验证Electron环境
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronSettingsManagerProxy can only be used in Electron renderer process');
    }
    this.electronAPI = window.electronAPI;
  }

  async saveSetting(setting: Setting): Promise<void> {
    const safeSetting = safeSerializeForIPC(setting);
    await this.electronAPI.settings.saveSetting(safeSetting);
  }

  async getSettings(): Promise<Setting[]> {
    return await this.electronAPI.settings.getSettings();
  }

  async getSetting(): Promise<Setting> {
    return await this.electronAPI.settings.getSetting();
  }

  async updateSetting(updates: Partial<OSSSettingKeys>): Promise<void> {
    const safeUpdates = safeSerializeForIPC(updates);
    await this.electronAPI.settings.updateSetting(safeUpdates);
  }

  async testSetting(): Promise<boolean> {
    return await this.electronAPI.settings.testSetting();
  }

  async getDefaultSetting(): Promise<Setting> {
    return await this.electronAPI.settings.getDefaultSetting();
  }

  async resetToDefault(): Promise<void> {
    await this.electronAPI.settings.resetToDefault();
  }

  async exportData(): Promise<Setting[]> {
    return await this.electronAPI.settings.exportData();
  }

  async importData(data: any): Promise<void> {
    const safeData = safeSerializeForIPC(data);
    await this.electronAPI.settings.importData(safeData);
  }

  async getDataType(): Promise<string> {
    return await this.electronAPI.settings.getDataType();
  }

  async validateData(data: any): Promise<boolean> {
    const safeData = safeSerializeForIPC(data);
    return await this.electronAPI.settings.validateData(safeData);
  }
}