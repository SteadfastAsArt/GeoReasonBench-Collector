/**
 * 存储适配器
 * 使用本地文件存储系统，解决IndexedDB的限制问题
 */

import { DataEntry, TagConfig, ExportConfig } from '../types';
import { localFileStorageManager } from './local-file-storage';
import { fileStorageManager } from './file-storage';
import { dbManager } from './database';
import { trueLocalStorageManager } from './true-local-storage';

// 存储模式
type StorageMode = 'trueLocalFile' | 'localFile' | 'fileSystem' | 'indexedDB';

class StorageAdapter {
  private mode: StorageMode = 'localFile';
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initializeStorage();
  }

  /**
   * 初始化存储系统
   */
  private async initializeStorage(): Promise<void> {
    try {
      console.log('🔄 初始化存储适配器...');
      
      // 优先尝试真正的本地文件存储（通过后端API）
      try {
        const trueLocalFileSuccess = await trueLocalStorageManager.initialize();
        if (trueLocalFileSuccess) {
          this.mode = 'trueLocalFile';
          this.initialized = true;
          console.log('✅ 使用真正的本地文件存储模式（后端API）');
          return;
        }
      } catch (error) {
        console.warn('⚠️ 真正的本地文件存储初始化失败:', error);
      }

      // 回退到浏览器本地文件存储
      try {
        await localFileStorageManager.initializeStorage();
        this.mode = 'localFile';
        this.initialized = true;
        console.log('✅ 使用浏览器本地文件存储模式');
        return;
      } catch (error) {
        console.warn('⚠️ 浏览器本地文件存储初始化失败:', error);
      }

      // 回退到文件系统存储
      try {
        await fileStorageManager.initializeStorage();
        this.mode = 'fileSystem';
        this.initialized = true;
        console.log('✅ 使用文件系统存储模式');
        return;
      } catch (error) {
        console.warn('⚠️ 文件系统存储初始化失败:', error);
      }

      // 最后回退到 IndexedDB
      try {
        // DatabaseManager 没有 initialize 方法，直接设置模式
        this.mode = 'indexedDB';
        this.initialized = true;
        console.log('✅ 使用 IndexedDB 存储模式');
        return;
      } catch (error) {
        console.error('❌ IndexedDB 存储初始化失败:', error);
      }

      throw new Error('所有存储模式初始化失败');
    } catch (error) {
      console.error('初始化存储系统完全失败:', error);
      throw error;
    }
  }

  /**
   * 确保存储系统已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.initialized) {
      throw new Error('Storage system not initialized');
    }
  }

  /**
   * 保存数据条目
   */
  async saveEntry(entry: DataEntry): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        await trueLocalStorageManager.saveEntry(entry);
      } else if (this.mode === 'localFile') {
        await localFileStorageManager.saveEntry(entry);
      } else if (this.mode === 'fileSystem') {
        await fileStorageManager.saveEntry(entry);
      } else {
        await dbManager.saveEntry(entry);
      }
    } catch (error) {
      console.error('保存数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据条目
   */
  async getEntry(id: string): Promise<DataEntry | null> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        const entry = await trueLocalStorageManager.getEntry(id);
        return entry || null;
      } else if (this.mode === 'localFile') {
        const entry = await localFileStorageManager.getEntry(id);
        return entry || null;
      } else if (this.mode === 'fileSystem') {
        return await fileStorageManager.getEntry(id);
      } else {
        return await dbManager.getEntry(id);
      }
    } catch (error) {
      console.error('获取数据条目失败:', error);
      return null;
    }
  }

  /**
   * 获取所有数据条目（用于列表显示）
   */
  async getAllEntries(): Promise<DataEntry[]> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        return await trueLocalStorageManager.getAllEntries();
      } else if (this.mode === 'localFile') {
        return await localFileStorageManager.getAllEntries();
      } else if (this.mode === 'fileSystem') {
        return await fileStorageManager.getAllEntries();
      } else {
        return await dbManager.getAllEntries();
      }
    } catch (error) {
      console.error('获取所有数据条目失败:', error);
      return [];
    }
  }

  /**
   * 获取所有数据条目（用于导出，包含完整图片数据）
   */
  async getAllEntriesForExport(): Promise<DataEntry[]> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        return await trueLocalStorageManager.getAllEntriesForExport();
      } else if (this.mode === 'localFile') {
        return await localFileStorageManager.getAllEntriesForExport();
      } else if (this.mode === 'fileSystem') {
        return await fileStorageManager.getAllEntriesForExport();
      } else {
        return await dbManager.getAllEntries();
      }
    } catch (error) {
      console.error('获取导出数据失败:', error);
      return [];
    }
  }

  /**
   * 删除数据条目
   */
  async deleteEntry(id: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        await trueLocalStorageManager.deleteEntry(id);
      } else if (this.mode === 'localFile') {
        await localFileStorageManager.deleteEntry(id);
      } else if (this.mode === 'fileSystem') {
        await fileStorageManager.deleteEntry(id);
      } else {
        await dbManager.deleteEntry(id);
      }
    } catch (error) {
      console.error('删除数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(key: string, data: TagConfig[] | ExportConfig): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        await trueLocalStorageManager.saveConfig(key, data);
      } else if (this.mode === 'localFile') {
        await localFileStorageManager.saveConfig(key, data);
      } else if (this.mode === 'fileSystem') {
        await fileStorageManager.saveConfig(key, data);
      } else {
        await dbManager.saveConfig(key, data);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  async getConfig<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        return await trueLocalStorageManager.getConfig(key);
      } else if (this.mode === 'localFile') {
        return await localFileStorageManager.getConfig(key);
      } else if (this.mode === 'fileSystem') {
        return await fileStorageManager.getConfig(key);
      } else {
        return await dbManager.getConfig(key);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      return null;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    mode: StorageMode;
    entryCount: number;
    totalSize: number;
  }> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        const stats = await trueLocalStorageManager.getStorageStats();
        return {
          mode: this.mode,
          entryCount: stats.entryCount || 0,
          totalSize: 0 // 真正的本地文件存储不计算总大小
        };
      } else if (this.mode === 'localFile') {
        const stats = await localFileStorageManager.getStorageStats();
        return {
          mode: this.mode,
          entryCount: stats.entryCount || 0,
          totalSize: 0 // 本地文件存储不计算总大小
        };
      } else if (this.mode === 'fileSystem') {
        const stats = await fileStorageManager.getStorageStats();
        return {
          mode: this.mode,
          entryCount: stats.entryCount || 0,
          totalSize: stats.totalUsed || 0
        };
      } else {
        const stats = await dbManager.getStorageStats();
        return {
          mode: this.mode,
          entryCount: stats.entryCount || 0,
          totalSize: stats.totalSize || 0
        };
      }
    } catch (error) {
      console.error('获取存储统计信息失败:', error);
      return {
        mode: this.mode,
        entryCount: 0,
        totalSize: 0
      };
    }
  }

  /**
   * 清理存储空间
   */
  async cleanupStorage(options?: {
    removeOldImages?: boolean;
    compressExistingImages?: boolean;
    maxImages?: number;
  }): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        // 真正的本地文件存储暂不支持清理
        console.log('真正的本地文件存储暂不支持清理功能');
      } else if (this.mode === 'localFile') {
        // 本地文件存储暂不支持清理
        console.log('本地文件存储暂不支持清理功能');
      } else if (this.mode === 'fileSystem') {
        await fileStorageManager.cleanupStorage(options);
      } else {
        // IndexedDB 暂不支持清理
        console.log('IndexedDB 暂不支持清理功能');
      }
    } catch (error) {
      console.error('清理存储空间失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.mode === 'trueLocalFile') {
        await trueLocalStorageManager.clearAll();
      } else if (this.mode === 'localFile') {
        await localFileStorageManager.clearAll();
      } else if (this.mode === 'fileSystem') {
        await fileStorageManager.clearAll();
      } else {
        await dbManager.clearAll();
      }
    } catch (error) {
      console.error('清空所有数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前存储模式
   */
  getCurrentMode(): StorageMode {
    return this.mode;
  }
}

// 创建单例实例
export const storageAdapter = new StorageAdapter();

// 导出类型
export type { StorageMode };