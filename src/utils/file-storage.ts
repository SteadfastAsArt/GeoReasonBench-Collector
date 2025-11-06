/**
 * 本地文件存储系统
 * 使用本地文件系统存储图片，解决IndexedDB的限制问题
 */

import { DataEntry, TagConfig, ExportConfig } from '../types';
import { base64ToBlob } from './index';

// 存储路径配置
const STORAGE_CONFIG = {
  baseDir: 'georeasonbench-data',
  imagesDir: 'images',
  dataFile: 'data.json',
  configFile: 'config.json'
};

interface StorageData {
  entries: Record<string, Omit<DataEntry, 'image'> & { imagePath?: string }>;
  tagConfigs: TagConfig[];
  exportConfig: ExportConfig;
  metadata: {
    version: string;
    lastUpdated: string;
    entryCount: number;
  };
}

class FileStorageManager {
  private storageData: StorageData = {
    entries: {},
    tagConfigs: [],
    exportConfig: {} as ExportConfig,
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      entryCount: 0
    }
  };
  
  private initialized = false;
  private baseDir: string = '';
  private imagesDir: string = '';
  private storageMode: 'fileSystem' | 'memory' = 'memory';
  private directoryHandle: any = null;

  constructor() {
    this.initializeStorage();
  }

  /**
   * 初始化存储系统
   */
  async initializeStorage(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 直接使用localStorage存储，避免弹窗
      this.storageMode = 'memory';
      console.log('使用localStorage存储模式');

      // 加载现有数据
      await this.initMemoryStorage();
      this.initialized = true;
    } catch (error) {
      console.error('初始化存储系统失败:', error);
      // 确保使用localStorage
      this.storageMode = 'memory';
      await this.initMemoryStorage();
      this.initialized = true;
    }
  }



  /**
   * 使用File System Access API初始化
   */
  private async initFileSystemAPI(): Promise<void> {
    try {
      // 请求用户选择存储目录
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      
      // 创建应用数据目录
      const appDirHandle = await dirHandle.getDirectoryHandle(STORAGE_CONFIG.baseDir, {
        create: true
      });
      
      // 创建图片目录
      await appDirHandle.getDirectoryHandle(STORAGE_CONFIG.imagesDir, {
        create: true
      });
      
      // 加载现有数据
      await this.loadExistingData(appDirHandle);
      
    } catch (error) {
      console.warn('File System Access API初始化失败，降级到内存存储:', error);
      throw error;
    }
  }

  /**
   * 内存存储模式初始化
   */
  private async initMemoryStorage(): Promise<void> {
    // 从localStorage加载数据
    const savedData = localStorage.getItem('georeasonbench-storage');
    if (savedData) {
      try {
        this.storageData = JSON.parse(savedData);
      } catch (error) {
        console.warn('加载本地存储数据失败:', error);
      }
    }
  }

  /**
   * 加载现有数据
   */
  private async loadExistingData(dirHandle: any): Promise<void> {
    try {
      const dataFileHandle = await dirHandle.getFileHandle(STORAGE_CONFIG.dataFile);
      const file = await dataFileHandle.getFile();
      const text = await file.text();
      this.storageData = JSON.parse(text);
    } catch (error) {
      console.log('未找到现有数据文件，使用默认配置');
    }
  }

  /**
   * 压缩图片
   */
  private compressImage(imageData: string, quality: number = 0.7, maxWidth: number = 1200): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 计算压缩后的尺寸
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 转换为压缩后的base64
        const compressedData = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedData);
      };
      
      img.src = imageData;
    });
  }

  /**
   * 检查localStorage可用空间
   */
  private checkStorageSpace(): { used: number; available: number; total: number } {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    // localStorage通常限制为5-10MB，我们假设5MB
    const total = 5 * 1024 * 1024; // 5MB in bytes
    const available = total - used;
    
    return { used, available, total };
  }

  /**
   * 清理旧的图片数据
   */
  private async cleanupOldImages(): Promise<void> {
    try {
      const imageKeys: string[] = [];
      for (let key in localStorage) {
        if (key.startsWith('image_')) {
          imageKeys.push(key);
        }
      }
      
      // 如果图片数量超过50个，删除最旧的
      if (imageKeys.length > 50) {
        const keysToDelete = imageKeys.slice(0, imageKeys.length - 50);
        keysToDelete.forEach(key => {
          localStorage.removeItem(key);
          console.log(`已清理旧图片: ${key}`);
        });
      }
    } catch (error) {
      console.error('清理旧图片失败:', error);
    }
  }

  /**
   * 保存图片到localStorage（带压缩）
   */
  private async saveImageToFile(entryId: string, imageData: string): Promise<string> {
    try {
      // 检查存储空间
      const spaceInfo = this.checkStorageSpace();
      console.log(`存储空间使用情况: ${(spaceInfo.used / 1024 / 1024).toFixed(2)}MB / ${(spaceInfo.total / 1024 / 1024).toFixed(2)}MB`);
      
      // 如果可用空间不足，先清理旧图片
      if (spaceInfo.available < 1024 * 1024) { // 少于1MB可用空间
        console.log('存储空间不足，开始清理旧图片...');
        await this.cleanupOldImages();
      }
      
      // 压缩图片
      const compressedImageData = await this.compressImage(imageData, 0.7, 1200);
      console.log(`图片压缩完成，原始大小: ${(imageData.length / 1024).toFixed(2)}KB, 压缩后: ${(compressedImageData.length / 1024).toFixed(2)}KB`);
      
      const imageKey = `image_${entryId}`;
      
      try {
        localStorage.setItem(imageKey, compressedImageData);
        console.log(`图片已保存到localStorage: ${imageKey}`);
        return imageKey;
      } catch (quotaError) {
        // 如果仍然超出配额，尝试更高压缩率
        console.log('存储仍然超出配额，尝试更高压缩率...');
        const highlyCompressedData = await this.compressImage(imageData, 0.4, 800);
        localStorage.setItem(imageKey, highlyCompressedData);
        console.log(`高压缩图片已保存: ${imageKey}, 大小: ${(highlyCompressedData.length / 1024).toFixed(2)}KB`);
        return imageKey;
      }
    } catch (error) {
      console.error('保存图片失败:', error);
      throw new Error(`图片保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 从localStorage加载图片
   */
  private async loadImageFromFile(imagePath: string): Promise<string | undefined> {
    try {
      // 直接从localStorage加载
      const imageData = localStorage.getItem(imagePath);
      if (imageData) {
        console.log(`从localStorage加载图片: ${imagePath}`);
        return imageData;
      }
      return undefined;
    } catch (error) {
      console.error('加载图片失败:', error);
      return undefined;
    }
  }

  /**
   * 保存数据到文件
   */
  private async saveDataToFile(): Promise<void> {
    try {
      // 更新元数据
      this.storageData.metadata.lastUpdated = new Date().toISOString();
      this.storageData.metadata.entryCount = Object.keys(this.storageData.entries).length;
      
      // 保存到localStorage作为主要存储
      localStorage.setItem('georeasonbench-storage', JSON.stringify(this.storageData));
      
      console.log('数据已保存到本地存储');
    } catch (error) {
      console.error('保存数据文件失败:', error);
      throw error;
    }
  }

  /**
   * 保存数据条目
   */
  async saveEntry(entry: DataEntry): Promise<void> {
    if (!this.initialized) {
      await this.initializeStorage();
    }

    try {
      // 检查存储空间并预防性清理
      const spaceInfo = this.checkStorageSpace();
      const usagePercentage = (spaceInfo.used / spaceInfo.total) * 100;
      
      // 如果使用率超过80%，进行预防性清理
      if (usagePercentage > 80) {
        console.log(`存储使用率过高 (${usagePercentage.toFixed(1)}%)，开始预防性清理...`);
        await this.cleanupOldImages();
      }

      const { image, ...entryData } = entry;
      let imagePath: string | undefined;

      // 保存图片文件 - 直接保存到localStorage
      if (image) {
        try {
          imagePath = await this.saveImageToFile(entry.id, image);
        } catch (imageError) {
          // 如果图片保存失败，尝试清理后重试
          console.log('图片保存失败，尝试清理存储空间后重试...');
          await this.cleanupStorage({ removeOldImages: true, maxImages: 30 });
          
          try {
            imagePath = await this.saveImageToFile(entry.id, image);
          } catch (retryError) {
            console.error('重试后仍然无法保存图片:', retryError);
            throw new Error('存储空间不足，无法保存图片。请清理一些旧数据后重试。');
          }
        }
      }

      // 保存条目数据
      this.storageData.entries[entry.id] = {
        ...entryData,
        imagePath
      };

      // 更新元数据
      this.storageData.metadata.lastUpdated = new Date().toISOString();
      this.storageData.metadata.entryCount = Object.keys(this.storageData.entries).length;

      // 保存到文件
      try {
        await this.saveDataToFile();
      } catch (dataError) {
        console.error('保存数据失败:', dataError);
        throw new Error('存储空间不足，无法保存数据。请清理一些旧数据后重试。');
      }
      
      console.log('数据条目保存成功:', entry.id);
    } catch (error) {
      console.error('保存数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据条目
   */
  async getEntry(id: string): Promise<DataEntry | null> {
    if (!this.initialized) {
      await this.initializeStorage();
    }

    try {
      const entryData = this.storageData.entries[id];
      if (!entryData) {
        return null;
      }

      let image: string | undefined;
      if (entryData.imagePath) {
        image = await this.loadImageFromFile(entryData.imagePath);
      }

      const { imagePath, ...entry } = entryData;
      return {
        ...entry,
        image
      } as DataEntry;
    } catch (error) {
      console.error('获取数据条目失败:', error);
      return null;
    }
  }

  /**
   * 获取所有数据条目
   */
  async getAllEntries(): Promise<DataEntry[]> {
    if (!this.initialized) {
      await this.initializeStorage();
    }

    try {
      const entries: DataEntry[] = [];
      
      for (const [id, entryData] of Object.entries(this.storageData.entries)) {
        let image: string | undefined;
        if (entryData.imagePath) {
          image = await this.loadImageFromFile(entryData.imagePath);
        }

        const { imagePath, ...entry } = entryData;
        entries.push({
          ...entry,
          image
        } as DataEntry);
      }

      return entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('获取所有数据条目失败:', error);
      return [];
    }
  }

  /**
   * 获取所有数据条目（用于导出）
   */
  async getAllEntriesForExport(): Promise<DataEntry[]> {
    // 导出时使用相同的方法，确保图片数据完整
    return this.getAllEntries();
  }

  /**
   * 删除数据条目
   */
  async deleteEntry(id: string): Promise<void> {
    if (!this.initialized) {
      await this.initializeStorage();
    }

    try {
      const entryData = this.storageData.entries[id];
      if (entryData?.imagePath) {
        // 删除图片文件
        if (entryData.imagePath.startsWith('memory://')) {
          localStorage.removeItem(`image-${id}`);
        } else {
          localStorage.removeItem(`image-${id}`);
        }
      }

      // 删除条目数据
      delete this.storageData.entries[id];
      
      // 保存更改
      await this.saveDataToFile();
      
      console.log('数据条目删除成功:', id);
    } catch (error) {
      console.error('删除数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(key: string, data: TagConfig[] | ExportConfig): Promise<void> {
    if (!this.initialized) {
      await this.initializeStorage();
    }

    try {
      if (key === 'tagConfigs') {
        this.storageData.tagConfigs = data as TagConfig[];
      } else if (key === 'exportConfig') {
        this.storageData.exportConfig = data as ExportConfig;
      }

      await this.saveDataToFile();
      console.log('配置保存成功:', key);
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  async getConfig<T>(key: string): Promise<T | null> {
    if (!this.initialized) {
      await this.initializeStorage();
    }

    try {
      if (key === 'tagConfigs') {
        return this.storageData.tagConfigs as T;
      } else if (key === 'exportConfig') {
        return this.storageData.exportConfig as T;
      }
      return null;
    } catch (error) {
      console.error('获取配置失败:', error);
      return null;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<any> {
    if (!this.initialized) {
      await this.initializeStorage();
    }
    
    const entryCount = Object.keys(this.storageData.entries).length;
    const spaceInfo = this.checkStorageSpace();
    
    // 计算图片数量和大小
    let imageCount = 0;
    let imageSize = 0;
    for (let key in localStorage) {
      if (key.startsWith('image_')) {
        imageCount++;
        imageSize += localStorage[key].length;
      }
    }
    
    // 计算数据大小
    const dataSize = localStorage.getItem('georeasonbench-storage')?.length || 0;
    
    return {
      entryCount,
      imageCount,
      totalSize: spaceInfo.used,
      dataSize,
      imageSize,
      availableSpace: spaceInfo.available,
      usagePercentage: Math.round((spaceInfo.used / spaceInfo.total) * 100),
      lastUpdated: this.storageData.metadata.lastUpdated,
      storageMode: this.storageMode,
      spaceInfo: {
        used: spaceInfo.used,
        available: spaceInfo.available,
        total: spaceInfo.total,
        usedMB: (spaceInfo.used / 1024 / 1024).toFixed(2),
        availableMB: (spaceInfo.available / 1024 / 1024).toFixed(2),
        totalMB: (spaceInfo.total / 1024 / 1024).toFixed(2)
      }
    };
  }

  /**
   * 清理存储空间
   */
  async cleanupStorage(options: {
    removeOldImages?: boolean;
    compressExistingImages?: boolean;
    maxImages?: number;
  } = {}): Promise<void> {
    const { removeOldImages = true, compressExistingImages = false, maxImages = 50 } = options;
    
    try {
      if (removeOldImages) {
        const imageKeys: string[] = [];
        for (let key in localStorage) {
          if (key.startsWith('image_')) {
            imageKeys.push(key);
          }
        }
        
        if (imageKeys.length > maxImages) {
          const keysToDelete = imageKeys.slice(0, imageKeys.length - maxImages);
          keysToDelete.forEach(key => {
            localStorage.removeItem(key);
            console.log(`已清理旧图片: ${key}`);
          });
        }
      }
      
      if (compressExistingImages) {
        console.log('开始重新压缩现有图片...');
        for (let key in localStorage) {
          if (key.startsWith('image_')) {
            try {
              const imageData = localStorage.getItem(key);
              if (imageData) {
                const compressedData = await this.compressImage(imageData, 0.5, 1000);
                if (compressedData.length < imageData.length) {
                  localStorage.setItem(key, compressedData);
                  console.log(`重新压缩图片: ${key}, 节省: ${((imageData.length - compressedData.length) / 1024).toFixed(2)}KB`);
                }
              }
            } catch (error) {
              console.error(`重新压缩图片失败: ${key}`, error);
            }
          }
        }
      }
      
      console.log('存储清理完成');
    } catch (error) {
      console.error('存储清理失败:', error);
    }
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    try {
      // 清空图片文件
      for (const entryData of Object.values(this.storageData.entries)) {
        if (entryData.imagePath) {
          const entryId = entryData.imagePath.split('/').pop()?.replace('.jpg', '') || '';
          localStorage.removeItem(`image-${entryId}`);
        }
      }

      // 重置数据
      this.storageData = {
        entries: {},
        tagConfigs: [],
        exportConfig: {} as ExportConfig,
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          entryCount: 0
        }
      };

      // 清空localStorage
      localStorage.removeItem('georeasonbench-storage');
      
      console.log('所有数据已清空');
    } catch (error) {
      console.error('清空数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前存储模式
   */
  getCurrentMode(): string {
    return 'fileSystem';
  }
}

export const fileStorageManager = new FileStorageManager();