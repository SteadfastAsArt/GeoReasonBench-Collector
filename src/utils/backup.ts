/**
 * 数据备份和恢复工具
 * 提供数据的备份、恢复和验证功能
 */

import { DataEntry, TagConfig, ExportConfig } from '../types';
import { storageAdapter } from './storage-adapter';
import { dbManager } from './database';

export interface BackupData {
  version: string;
  timestamp: string;
  entries: DataEntry[];
  tagConfigs: TagConfig[];
  exportConfig: ExportConfig;
  metadata: {
    entryCount: number;
    totalSize: number;
    storageMode: string;
  };
}

export interface BackupOptions {
  includeImages?: boolean;
  compress?: boolean;
  validate?: boolean;
}

export class BackupManager {
  private static readonly BACKUP_VERSION = '1.0.0';
  private static readonly MAX_BACKUP_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * 创建数据备份
   */
  static async createBackup(options: BackupOptions = {}): Promise<BackupData> {
    console.log('BackupManager: Creating backup with options:', options);
    
    try {
      const {
        includeImages = true,
        validate = true
      } = options;

      // 获取所有数据
      const [entries, tagConfigs, exportConfig] = await Promise.all([
        storageAdapter.getAllEntries(),
        storageAdapter.getConfig<TagConfig[]>('tagConfigs'),
        storageAdapter.getConfig<ExportConfig>('exportConfig')
      ]);

      let processedEntries = entries || [];

      // 如果不包含图片，移除图片数据
      if (!includeImages) {
        console.log('BackupManager: Excluding images from backup');
        processedEntries = processedEntries.map(entry => ({
          ...entry,
          image: undefined
        }));
      }

      // 创建备份数据
      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        entries: processedEntries,
        tagConfigs: tagConfigs || [],
        exportConfig: exportConfig || {} as ExportConfig,
        metadata: {
          entryCount: processedEntries.length,
          totalSize: JSON.stringify(processedEntries).length,
          storageMode: storageAdapter.getCurrentMode()
        }
      };

      // 验证备份数据
      if (validate) {
        await this.validateBackup(backupData);
      }

      // 检查备份大小
      const backupSize = JSON.stringify(backupData).length;
      if (backupSize > this.MAX_BACKUP_SIZE) {
        console.warn('BackupManager: Backup size exceeds recommended limit:', backupSize);
      }

      console.log('BackupManager: Backup created successfully', {
        entryCount: backupData.metadata.entryCount,
        size: backupSize
      });

      return backupData;
    } catch (error) {
      console.error('BackupManager: Failed to create backup:', error);
      throw new Error(`备份创建失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 恢复数据备份
   */
  static async restoreBackup(backupData: BackupData, options: { overwrite?: boolean } = {}): Promise<void> {
    console.log('BackupManager: Restoring backup from:', backupData.timestamp);
    
    try {
      const { overwrite = false } = options;

      // 验证备份数据
      await this.validateBackup(backupData);

      // 如果不覆盖，先备份当前数据
      if (!overwrite) {
        console.log('BackupManager: Creating safety backup before restore');
        const safetyBackup = await this.createBackup({ validate: false });
        localStorage.setItem('safety_backup', JSON.stringify(safetyBackup));
      }

      // 清空当前数据
      await storageAdapter.clearAll();

      // 恢复数据条目
      console.log('BackupManager: Restoring entries...');
      for (const entry of backupData.entries) {
        await storageAdapter.saveEntry(entry);
      }

      // 恢复配置
      console.log('BackupManager: Restoring configurations...');
      if (backupData.tagConfigs.length > 0) {
        await storageAdapter.saveConfig('tagConfigs', backupData.tagConfigs);
      }
      
      if (backupData.exportConfig) {
        await storageAdapter.saveConfig('exportConfig', backupData.exportConfig);
      }

      console.log('BackupManager: Backup restored successfully');
    } catch (error) {
      console.error('BackupManager: Failed to restore backup:', error);
      
      // 尝试恢复安全备份
      try {
        const safetyBackup = localStorage.getItem('safety_backup');
        if (safetyBackup) {
          console.log('BackupManager: Attempting to restore safety backup');
          const safetyData = JSON.parse(safetyBackup) as BackupData;
          await this.restoreBackup(safetyData, { overwrite: true });
          localStorage.removeItem('safety_backup');
        }
      } catch (safetyError) {
        console.error('BackupManager: Failed to restore safety backup:', safetyError);
      }
      
      throw new Error(`备份恢复失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证备份数据
   */
  static async validateBackup(backupData: BackupData): Promise<void> {
    console.log('BackupManager: Validating backup data');
    
    try {
      // 检查基本结构
      if (!backupData.version || !backupData.timestamp || !backupData.entries) {
        throw new Error('备份数据结构不完整');
      }

      // 检查版本兼容性
      if (backupData.version !== this.BACKUP_VERSION) {
        console.warn('BackupManager: Version mismatch, attempting compatibility mode');
      }

      // 验证数据条目
      for (const entry of backupData.entries) {
        if (!entry.id || !entry.query) {
          throw new Error(`数据条目验证失败: ${entry.id || 'unknown'}`);
        }
      }

      // 验证元数据
      if (backupData.metadata.entryCount !== backupData.entries.length) {
        console.warn('BackupManager: Entry count mismatch in metadata');
      }

      console.log('BackupManager: Backup validation completed');
    } catch (error) {
      console.error('BackupManager: Backup validation failed:', error);
      throw new Error(`备份验证失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 导出备份到文件
   */
  static async exportBackupToFile(backupData: BackupData, filename?: string): Promise<void> {
    try {
      const fileName = filename || `backup_${new Date().toISOString().split('T')[0]}.json`;
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('BackupManager: Backup exported to file:', fileName);
    } catch (error) {
      console.error('BackupManager: Failed to export backup:', error);
      throw new Error(`备份导出失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从文件导入备份
   */
  static async importBackupFromFile(file: File): Promise<BackupData> {
    try {
      console.log('BackupManager: Importing backup from file:', file.name);
      
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;
      
      // 验证导入的数据
      await this.validateBackup(backupData);
      
      console.log('BackupManager: Backup imported successfully from file');
      return backupData;
    } catch (error) {
      console.error('BackupManager: Failed to import backup:', error);
      throw new Error(`备份导入失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取备份统计信息
   */
  static getBackupStats(backupData: BackupData): {
    entryCount: number;
    imageCount: number;
    totalSize: string;
    createdAt: string;
    version: string;
  } {
    const imageCount = backupData.entries.reduce((count, entry) => 
      count + (entry.image ? 1 : 0), 0
    );
    
    const totalSize = (JSON.stringify(backupData).length / 1024 / 1024).toFixed(2) + ' MB';
    
    return {
      entryCount: backupData.metadata.entryCount,
      imageCount,
      totalSize,
      createdAt: backupData.timestamp,
      version: backupData.version
    };
  }
}

// 导出单例实例
export const backupManager = BackupManager;