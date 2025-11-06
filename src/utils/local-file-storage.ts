/**
 * 本地文件系统存储管理器
 * 使用 File System Access API 和本地目录进行数据持久化
 */

import { DataEntry } from '../types';

interface StorageMetadata {
  version: string;
  lastUpdated: string;
  entryCount: number;
}

interface StorageData {
  entries: Record<string, DataEntry>;
  metadata: StorageMetadata;
}

export class LocalFileStorageManager {
  private dataDir: string;
  private storageData: StorageData;
  private initialized: boolean = false;
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private imagesDirectoryHandle: FileSystemDirectoryHandle | null = null;

  constructor() {
    this.dataDir = '/Users/andrianlee/proj/GeoReasonBench-Collector/data';
    
    this.storageData = {
      entries: {},
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entryCount: 0
      }
    };
  }

  /**
   * 初始化存储系统
   */
  async initializeStorage(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('初始化本地文件存储系统...');
      
      // 请求目录访问权限
      await this.requestDirectoryAccess();
      
      // 加载现有数据
      await this.loadDataFromFile();
      
      this.initialized = true;
      console.log('本地文件存储系统初始化完成');
    } catch (error) {
      console.error('初始化本地文件存储系统失败:', error);
      // 降级到 localStorage
      await this.loadFromLocalStorage();
      this.initialized = true;
    }
  }

  /**
   * 请求目录访问权限
   */
  private async requestDirectoryAccess(): Promise<void> {
    if ('showDirectoryPicker' in window) {
      try {
        this.directoryHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents'
        });
        
        // 创建或获取 images 子目录
        this.imagesDirectoryHandle = await this.directoryHandle!.getDirectoryHandle('images', {
          create: true
        });
        
        console.log('目录访问权限已获取');
      } catch (error) {
        console.error('获取目录访问权限失败:', error);
        throw error;
      }
    } else {
      throw new Error('File System Access API 不支持');
    }
  }

  /**
   * 从文件加载数据
   */
  private async loadDataFromFile(): Promise<void> {
    if (!this.directoryHandle) {
      throw new Error('目录句柄未初始化');
    }

    try {
      const fileHandle = await this.directoryHandle.getFileHandle('entries.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      this.storageData = JSON.parse(text);
      console.log(`从文件加载了 ${this.storageData.metadata.entryCount} 条数据`);
    } catch (error) {
      // 文件不存在，使用默认数据
      console.log('数据文件不存在，使用默认数据');
    }
  }

  /**
   * 从 localStorage 加载数据（降级方案）
   */
  private async loadFromLocalStorage(): Promise<void> {
    try {
      const data = localStorage.getItem('georeasonbench-storage');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.entries) {
          this.storageData.entries = parsed.entries;
          this.storageData.metadata.entryCount = Object.keys(parsed.entries).length;
          this.storageData.metadata.lastUpdated = new Date().toISOString();
          console.log(`从 localStorage 加载了 ${this.storageData.metadata.entryCount} 条数据`);
        }
      }
    } catch (error) {
      console.error('从 localStorage 加载数据失败:', error);
    }
  }

  /**
   * 保存数据到文件
   */
  private async saveDataToFile(): Promise<void> {
    if (!this.directoryHandle) {
      // 降级到 localStorage
      await this.saveToLocalStorage();
      return;
    }

    try {
      const dataToSave = JSON.stringify(this.storageData, null, 2);
      const fileHandle = await this.directoryHandle.getFileHandle('entries.json', {
        create: true
      });
      const writable = await fileHandle.createWritable();
      await writable.write(dataToSave);
      await writable.close();
      
      console.log('数据已保存到文件: entries.json');
    } catch (error) {
      console.error('保存数据到文件失败:', error);
      // 降级到 localStorage
      await this.saveToLocalStorage();
    }
  }

  /**
   * 保存到 localStorage（降级方案）
   */
  private async saveToLocalStorage(): Promise<void> {
    try {
      const dataToSave = {
        entries: this.storageData.entries,
        metadata: this.storageData.metadata
      };
      localStorage.setItem('georeasonbench-storage', JSON.stringify(dataToSave));
      console.log('数据已保存到 localStorage');
    } catch (error) {
      console.error('保存到 localStorage 失败:', error);
      throw error;
    }
  }

  /**
   * 保存图片到文件
   */
  private async saveImageToFile(entryId: string, imageData: string): Promise<string> {
    const fileName = `${entryId}.jpg`;
    
    if (!this.imagesDirectoryHandle) {
      // 降级到 localStorage
      localStorage.setItem(`image_${entryId}`, imageData);
      console.log('图片已保存到 localStorage:', `image_${entryId}`);
      return imageData; // 返回原始 base64 数据
    }

    try {
      // 将 base64 转换为 Blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      const fileHandle = await this.imagesDirectoryHandle.getFileHandle(fileName, {
        create: true
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      console.log('图片已保存到文件:', fileName);
      return `images/${fileName}`;
    } catch (error) {
      console.error('保存图片失败:', error);
      // 降级到 localStorage
      localStorage.setItem(`image_${entryId}`, imageData);
      return imageData;
    }
  }

  /**
   * 从文件加载图片
   */
  private async loadImageFromFile(entryId: string): Promise<string | undefined> {
    const fileName = `${entryId}.jpg`;
    
    if (!this.imagesDirectoryHandle) {
      // 从 localStorage 加载
      return localStorage.getItem(`image_${entryId}`) || undefined;
    }

    try {
      const fileHandle = await this.imagesDirectoryHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('加载图片失败:', error);
      // 降级到 localStorage
      return localStorage.getItem(`image_${entryId}`) || undefined;
    }
  }

  /**
   * 保存数据条目
   */
  async saveEntry(entry: DataEntry): Promise<void> {
    await this.initializeStorage();

    try {
      // 处理图片数据
      if (entry.image && entry.image.startsWith('data:')) {
        const imagePath = await this.saveImageToFile(entry.id, entry.image);
        entry = {
          ...entry,
          image: imagePath.startsWith('data:') ? entry.image : imagePath
        };
      }

      // 保存条目数据
      this.storageData.entries[entry.id] = entry;
      
      // 更新元数据
      this.storageData.metadata.lastUpdated = new Date().toISOString();
      this.storageData.metadata.entryCount = Object.keys(this.storageData.entries).length;

      // 保存到文件
      await this.saveDataToFile();
      
      console.log('数据条目保存成功:', entry.id);
    } catch (error) {
      console.error('保存条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据条目
   */
  async getEntry(id: string): Promise<DataEntry | undefined> {
    await this.initializeStorage();

    const entry = this.storageData.entries[id];
    if (!entry) {
      return undefined;
    }

    // 如果图片路径是文件路径，加载图片数据
    if (entry.image && entry.image.startsWith('images/')) {
      const imageData = await this.loadImageFromFile(id);
      return {
        ...entry,
        image: imageData || entry.image
      };
    }

    return entry;
  }

  /**
   * 获取所有数据条目
   */
  async getAllEntries(): Promise<DataEntry[]> {
    await this.initializeStorage();

    const entries: DataEntry[] = [];
    
    for (const [id, entry] of Object.entries(this.storageData.entries)) {
      // 如果图片路径是文件路径，加载图片数据
      if (entry.image && entry.image.startsWith('images/')) {
        const imageData = await this.loadImageFromFile(id);
        entries.push({
          ...entry,
          image: imageData || entry.image
        });
      } else {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * 获取所有条目用于导出
   */
  async getAllEntriesForExport(): Promise<DataEntry[]> {
    return this.getAllEntries();
  }

  /**
   * 删除数据条目
   */
  async deleteEntry(id: string): Promise<void> {
    await this.initializeStorage();

    const entry = this.storageData.entries[id];
    if (entry && entry.image) {
      // 删除图片文件
      try {
        if (this.imagesDirectoryHandle && entry.image.startsWith('images/')) {
          const fileName = `${id}.jpg`;
          await this.imagesDirectoryHandle.removeEntry(fileName);
        } else {
          localStorage.removeItem(`image_${id}`);
        }
      } catch (error) {
        console.error('删除图片文件失败:', error);
      }
    }

    // 删除条目数据
    delete this.storageData.entries[id];
    
    // 更新元数据
    this.storageData.metadata.lastUpdated = new Date().toISOString();
    this.storageData.metadata.entryCount = Object.keys(this.storageData.entries).length;

    // 保存到文件
    await this.saveDataToFile();
  }

  /**
   * 保存配置
   */
  async saveConfig(key: string, value: any): Promise<void> {
    // 配置可以保存在单独的文件中
    console.log('保存配置:', key, value);
  }

  /**
   * 获取配置
   */
  async getConfig(key: string): Promise<any> {
    // 从配置文件加载
    console.log('获取配置:', key);
    return null;
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<any> {
    await this.initializeStorage();
    
    const entryCount = Object.keys(this.storageData.entries).length;
    const imageCount = Object.values(this.storageData.entries).filter(entry => entry.image).length;
    
    return {
      entryCount,
      imageCount,
      lastUpdated: this.storageData.metadata.lastUpdated,
      storageMode: this.directoryHandle ? 'localFile' : 'localStorage',
      dataDirectory: this.dataDir
    };
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await this.initializeStorage();
    
    // 清空内存数据
    this.storageData = {
      entries: {},
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entryCount: 0
      }
    };
    
    // 删除所有文件
    try {
      if (this.imagesDirectoryHandle) {
        // 删除所有图片文件
        try {
          for await (const [name] of (this.imagesDirectoryHandle as any).entries()) {
            await this.imagesDirectoryHandle.removeEntry(name);
          }
        } catch (error) {
          console.error('删除图片文件失败:', error);
        }
      } else {
        // 清空 localStorage 中的图片
        for (let key in localStorage) {
          if (key.startsWith('image_')) {
            localStorage.removeItem(key);
          }
        }
      }
      
      // 保存空数据
      await this.saveDataToFile();
    } catch (error) {
      console.error('清空数据失败:', error);
    }
    
    console.log('所有数据已清空');
  }
}

// 创建单例实例
export const localFileStorageManager = new LocalFileStorageManager();