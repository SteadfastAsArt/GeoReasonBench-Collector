/**
 * 数据迁移工具
 * 负责将localStorage中的数据迁移到IndexedDB
 */

import { DataEntry, TagConfig, ExportConfig } from '../types';
import { dbManager } from './database';
import { getCompressedItem, setCompressedItem, removeCompressedItem } from './compression';

// 迁移状态
interface MigrationStatus {
  isCompleted: boolean;
  version: string;
  migratedAt: string;
  entriesCount: number;
  configsCount: number;
}

// localStorage键名
const STORAGE_KEYS = {
  DATA_ENTRIES: 'dataEntries',
  TAG_CONFIGS: 'tagConfigs',
  EXPORT_CONFIG: 'exportConfig',
  MIGRATION_STATUS: 'migrationStatus'
} as const;

class MigrationManager {
  private readonly MIGRATION_VERSION = '1.0.0';

  /**
   * 检查是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    try {
      // 检查迁移状态
      const migrationStatus = await this.getMigrationStatus();
      if (migrationStatus?.isCompleted && migrationStatus.version === this.MIGRATION_VERSION) {
        return false;
      }

      // 检查localStorage中是否有数据
      const hasLocalStorageData = this.hasLocalStorageData();
      return hasLocalStorageData;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * 执行完整迁移
   */
  async migrate(onProgress?: (progress: { step: string; current: number; total: number }) => void): Promise<MigrationStatus> {
    console.log('MigrationManager: 开始数据迁移...');
    
    try {
      const startTime = Date.now();
      
      // 检查IndexedDB可用性
      if (!window.indexedDB) {
        throw new Error('IndexedDB不受支持，无法进行迁移');
      }
      
      // 获取待迁移数据的总数
      const localEntries = getCompressedItem<DataEntry[]>(STORAGE_KEYS.DATA_ENTRIES) || [];
      const totalSteps = localEntries.length + 2; // 数据条目 + 配置项
      let currentStep = 0;

      // 1. 迁移数据条目
      onProgress?.({ step: '迁移数据条目', current: currentStep, total: totalSteps });
      const entriesCount = await this.migrateDataEntries((current, total) => {
        onProgress?.({ step: '迁移数据条目', current: currentStep + current, total: totalSteps });
      });
      currentStep += entriesCount;
      console.log(`MigrationManager: 已迁移 ${entriesCount} 个数据条目`);

      // 2. 迁移配置数据
      onProgress?.({ step: '迁移配置数据', current: currentStep, total: totalSteps });
      const configsCount = await this.migrateConfigs();
      currentStep += configsCount;
      console.log(`MigrationManager: 已迁移 ${configsCount} 个配置项`);

      // 3. 验证迁移结果
      onProgress?.({ step: '验证迁移结果', current: currentStep, total: totalSteps });
      const validation = await this.validateMigration();
      if (!validation.isValid) {
        console.warn('MigrationManager: 迁移验证发现问题:', validation.issues);
      }

      // 4. 记录迁移状态
      const migrationStatus: MigrationStatus = {
        isCompleted: true,
        version: this.MIGRATION_VERSION,
        migratedAt: new Date().toISOString(),
        entriesCount,
        configsCount
      };

      await this.saveMigrationStatus(migrationStatus);

      const duration = Date.now() - startTime;
      console.log(`MigrationManager: 数据迁移完成，耗时 ${duration}ms`);

      onProgress?.({ step: '迁移完成', current: totalSteps, total: totalSteps });
      return migrationStatus;
    } catch (error) {
      console.error('MigrationManager: 数据迁移失败:', error);
      
      // 尝试回滚
      try {
        console.log('MigrationManager: 尝试回滚迁移...');
        await this.rollback();
      } catch (rollbackError) {
        console.error('MigrationManager: 回滚失败:', rollbackError);
      }
      
      throw new Error(`数据迁移失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 迁移数据条目
   */
  private async migrateDataEntries(onProgress?: (current: number, total: number) => void): Promise<number> {
    try {
      const dataEntries = getCompressedItem<DataEntry[]>(STORAGE_KEYS.DATA_ENTRIES) || [];
      
      if (dataEntries.length === 0) {
        return 0;
      }

      console.log(`开始迁移 ${dataEntries.length} 个数据条目...`);

      // 批量迁移，每批处理50个条目
      const batchSize = 50;
      let migratedCount = 0;

      for (let i = 0; i < dataEntries.length; i += batchSize) {
        const batch = dataEntries.slice(i, i + batchSize);
        
        // 并行处理当前批次
        await Promise.all(
          batch.map(async (entry: DataEntry) => {
            try {
              await dbManager.saveEntry(entry);
              migratedCount++;
            } catch (error) {
              console.error(`迁移条目 ${entry.id} 失败:`, error);
            }
          })
        );

        // 显示进度
        const progress = Math.round((migratedCount / dataEntries.length) * 100);
        console.log(`数据条目迁移进度: ${progress}% (${migratedCount}/${dataEntries.length})`);
        onProgress?.(migratedCount, dataEntries.length);
      }

      return migratedCount;
    } catch (error) {
      console.error('迁移数据条目失败:', error);
      return 0;
    }
  }

  /**
   * 迁移配置数据
   */
  private async migrateConfigs(): Promise<number> {
    let configsCount = 0;

    try {
      // 迁移标签配置
      const tagConfigs = getCompressedItem<TagConfig[]>(STORAGE_KEYS.TAG_CONFIGS);
      if (tagConfigs) {
        await dbManager.saveConfig('tagConfigs', tagConfigs);
        configsCount++;
        console.log('已迁移标签配置');
      }

      // 迁移导出配置
      const exportConfig = getCompressedItem<ExportConfig>(STORAGE_KEYS.EXPORT_CONFIG);
      if (exportConfig) {
        await dbManager.saveConfig('exportConfig', exportConfig);
        configsCount++;
        console.log('已迁移导出配置');
      }

      return configsCount;
    } catch (error) {
      console.error('迁移配置数据失败:', error);
      return configsCount;
    }
  }

  /**
   * 清理localStorage数据（迁移完成后）
   */
  async cleanupLocalStorage(): Promise<void> {
    try {
      console.log('清理localStorage数据...');
      
      // 移除已迁移的数据
      removeCompressedItem(STORAGE_KEYS.DATA_ENTRIES);
      removeCompressedItem(STORAGE_KEYS.TAG_CONFIGS);
      removeCompressedItem(STORAGE_KEYS.EXPORT_CONFIG);

      console.log('localStorage清理完成');
    } catch (error) {
      console.error('清理localStorage失败:', error);
    }
  }

  /**
   * 回滚迁移（紧急情况下使用）
   */
  async rollback(): Promise<void> {
    try {
      console.log('开始回滚迁移...');

      // 从IndexedDB读取数据并写回localStorage
      const entries = await dbManager.getAllEntries();
      if (entries.length > 0) {
        setCompressedItem(STORAGE_KEYS.DATA_ENTRIES, entries);
      }

      const tagConfigs = await dbManager.getConfig<TagConfig[]>('tagConfigs');
      if (tagConfigs) {
        setCompressedItem(STORAGE_KEYS.TAG_CONFIGS, tagConfigs);
      }

      const exportConfig = await dbManager.getConfig<ExportConfig>('exportConfig');
      if (exportConfig) {
        setCompressedItem(STORAGE_KEYS.EXPORT_CONFIG, exportConfig);
      }

      // 清除迁移状态
      await this.clearMigrationStatus();

      console.log('迁移回滚完成');
    } catch (error) {
      console.error('迁移回滚失败:', error);
      throw error;
    }
  }

  /**
   * 获取迁移状态
   */
  private async getMigrationStatus(): Promise<MigrationStatus | null> {
    try {
      return await dbManager.getConfig<MigrationStatus>('migrationStatus');
    } catch (error) {
      console.error('获取迁移状态失败:', error);
      return null;
    }
  }

  /**
   * 保存迁移状态
   */
  private async saveMigrationStatus(status: MigrationStatus): Promise<void> {
    try {
      await dbManager.saveConfig('migrationStatus', status);
    } catch (error) {
      console.error('保存迁移状态失败:', error);
      throw error;
    }
  }

  /**
   * 清除迁移状态
   */
  private async clearMigrationStatus(): Promise<void> {
    try {
      // 创建一个空的迁移状态
      const emptyStatus: MigrationStatus = {
        isCompleted: false,
        version: '',
        migratedAt: '',
        entriesCount: 0,
        configsCount: 0
      };
      await dbManager.saveConfig('migrationStatus', emptyStatus as any);
    } catch (error) {
      console.error('清除迁移状态失败:', error);
    }
  }

  /**
   * 检查localStorage中是否有数据
   */
  private hasLocalStorageData(): boolean {
    try {
      const dataEntries = getCompressedItem<DataEntry[]>(STORAGE_KEYS.DATA_ENTRIES);
      const tagConfigs = getCompressedItem<TagConfig[]>(STORAGE_KEYS.TAG_CONFIGS);
      const exportConfig = getCompressedItem<ExportConfig>(STORAGE_KEYS.EXPORT_CONFIG);

      return !!(dataEntries?.length || tagConfigs?.length || exportConfig);
    } catch (error) {
      console.error('检查localStorage数据失败:', error);
      return false;
    }
  }

  /**
   * 获取迁移进度信息
   */
  async getMigrationProgress(): Promise<{
    localStorageEntries: number;
    indexedDBEntries: number;
    migrationStatus: MigrationStatus | null;
  }> {
    try {
      const localStorageEntries = getCompressedItem<DataEntry[]>(STORAGE_KEYS.DATA_ENTRIES)?.length || 0;
      const stats = await dbManager.getStorageStats();
      const migrationStatus = await this.getMigrationStatus();

      return {
        localStorageEntries,
        indexedDBEntries: stats.entryCount,
        migrationStatus
      };
    } catch (error) {
      console.error('获取迁移进度失败:', error);
      return {
        localStorageEntries: 0,
        indexedDBEntries: 0,
        migrationStatus: null
      };
    }
  }

  /**
   * 验证迁移结果
   */
  async validateMigration(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // 检查数据完整性
      const localStorageEntries = getCompressedItem<DataEntry[]>(STORAGE_KEYS.DATA_ENTRIES) || [];
      const indexedDBEntries = await dbManager.getAllEntries();

      if (localStorageEntries.length !== indexedDBEntries.length) {
        issues.push(`数据条目数量不匹配: localStorage(${localStorageEntries.length}) vs IndexedDB(${indexedDBEntries.length})`);
      }

      // 检查配置数据
      const localTagConfigs = getCompressedItem<TagConfig[]>(STORAGE_KEYS.TAG_CONFIGS);
      const indexedTagConfigs = await dbManager.getConfig<TagConfig[]>('tagConfigs');

      if (localTagConfigs && !indexedTagConfigs) {
        issues.push('标签配置迁移失败');
      }

      const localExportConfig = getCompressedItem<ExportConfig>(STORAGE_KEYS.EXPORT_CONFIG);
      const indexedExportConfig = await dbManager.getConfig<ExportConfig>('exportConfig');

      if (localExportConfig && !indexedExportConfig) {
        issues.push('导出配置迁移失败');
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('验证迁移结果失败:', error);
      return {
        isValid: false,
        issues: ['验证过程中发生错误']
      };
    }
  }
}

// 创建单例实例
export const migrationManager = new MigrationManager();

// 导出类型
export type { MigrationStatus };