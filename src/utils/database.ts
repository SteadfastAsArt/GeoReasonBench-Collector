/**
 * IndexedDB 数据库封装工具
 * 提供高性能的本地数据存储解决方案
 */

import { DataEntry, TagConfig, ExportConfig } from '../types';

// 数据库配置
const DB_NAME = 'GeoReasonBenchDB';
const DB_VERSION = 1;

// 对象存储名称
const STORES = {
  ENTRIES: 'entries',           // 数据条目（文本数据）
  IMAGES: 'images',            // 图片数据（包含原图和缩略图）
  CONFIGS: 'configs',          // 配置数据
  METADATA: 'metadata'         // 元数据
} as const;

// 数据库接口
interface DBEntry {
  id: string;
  data: Omit<DataEntry, 'image'>;  // 不包含图片的数据条目
  createdAt: string;
  updatedAt: string;
}

// 数据库存储结构
interface DBDataEntry extends Omit<DataEntry, 'image'> {
  imageId?: string; // 图片ID，关联到images表
}

interface DBImage {
  id: string;
  originalData: string; // 原图Base64数据
  thumbnailData: string; // 缩略图Base64数据
  originalSize: number; // 原图大小（字节）
  thumbnailSize: number; // 缩略图大小（字节）
  type: string; // 图片类型
  width?: number; // 原图宽度
  height?: number; // 原图高度
  thumbnailWidth: number; // 缩略图宽度
  thumbnailHeight: number; // 缩略图高度
  createdAt: string;
}



interface DBConfig {
  key: string;
  data: TagConfig[] | ExportConfig | any; // 允许任意类型的配置数据
  updatedAt: string;
}

class DatabaseManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  /**
   * 初始化数据库
   */
  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Initializing IndexedDB...');
      
      // 检查浏览器是否支持IndexedDB
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('Database initialization failed:', error);
        reject(new Error(`Failed to open database: ${error?.message || 'Unknown error'}`));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('Database initialized successfully');
        
        // 添加数据库错误处理
        this.db.onerror = (event) => {
          console.error('Database error:', event);
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('Database upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;

        try {
          // 创建数据条目存储
          if (!db.objectStoreNames.contains(STORES.ENTRIES)) {
            console.log('Creating entries store');
            const entryStore = db.createObjectStore(STORES.ENTRIES, { keyPath: 'id' });
            entryStore.createIndex('createdAt', 'createdAt');
            entryStore.createIndex('updatedAt', 'updatedAt');
          }

          // 创建图片存储
          if (!db.objectStoreNames.contains(STORES.IMAGES)) {
            console.log('Creating images store');
            const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
            imageStore.createIndex('originalSize', 'originalSize');
            imageStore.createIndex('createdAt', 'createdAt');
          }

          // 创建配置存储
          if (!db.objectStoreNames.contains(STORES.CONFIGS)) {
            console.log('Creating configs store');
            db.createObjectStore(STORES.CONFIGS, { keyPath: 'key' });
          }

          // 创建元数据存储
          if (!db.objectStoreNames.contains(STORES.METADATA)) {
            console.log('Creating metadata store');
            db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
          }
          
          console.log('Database schema created successfully');
        } catch (error) {
          console.error('Error creating database schema:', error);
          reject(error);
        }
      };

      request.onblocked = () => {
        console.warn('Database upgrade blocked by another connection');
        reject(new Error('Database upgrade blocked. Please close other tabs and try again.'));
      };
    });
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * 保存数据条目
   */
  async saveEntry(entry: DataEntry): Promise<void> {
    console.log('Saving entry:', entry.id);
    
    try {
      const db = await this.ensureDB();
      
      // 分离图片数据和文本数据，分别保存
      const { image, ...entryData } = entry;
      
      // 1. 首先保存文本数据（优先保证文本数据保存成功）
      await this.saveEntryData(entryData, entry.id, entry.createdAt, entry.updatedAt);
      console.log('Entry text data saved successfully:', entry.id);
      
      // 2. 异步保存图片数据（不阻塞文本数据保存）
      if (image) {
        this.saveImageDataAsync(entry.id, image, entry.createdAt)
          .catch(error => {
            console.error('Image save failed for entry:', entry.id, error);
            // 图片保存失败不影响整体流程
          });
      }
      
    } catch (error) {
      console.error('Error saving entry:', error);
      throw new Error(`Failed to save entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 保存文本数据
   */
  private async saveEntryData(entryData: Omit<DataEntry, 'image'>, id: string, createdAt: string, updatedAt: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
    
    const entryStore = transaction.objectStore(STORES.ENTRIES);
    const dbEntry: DBEntry = {
      id,
      data: entryData,
      createdAt,
      updatedAt
    };
    
    const entryRequest = entryStore.put(dbEntry);
    await this.promisifyRequest(entryRequest);
    await this.promisifyRequest(transaction);
  }

  /**
   * 异步保存图片数据
   */
  private async saveImageDataAsync(entryId: string, image: string, createdAt: string): Promise<void> {
    try {
      console.log('Saving image data for entry:', entryId);
      const db = await this.ensureDB();
      
      // 使用独立的事务保存图片
      const transaction = db.transaction([STORES.IMAGES], 'readwrite');
      const imageStore = transaction.objectStore(STORES.IMAGES);
      
      // 设置较短的超时时间，避免长时间阻塞
      const imageProcessingPromise = this.processImageWithTimeout(image, entryId, createdAt);
      
      const dbImage = await imageProcessingPromise;
      const imageRequest = imageStore.put(dbImage);
      await this.promisifyRequest(imageRequest);
      await this.promisifyRequest(transaction);
      
      console.log('Image data saved successfully for entry:', entryId);
    } catch (error) {
      console.error('Failed to save image data for entry:', entryId, error);
      throw error;
    }
  }

  /**
   * 带超时的图片处理
   */
  private async processImageWithTimeout(image: string, entryId: string, createdAt: string): Promise<DBImage> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('图片处理超时')), 10000); // 10秒超时
    });

    const processingPromise = (async (): Promise<DBImage> => {
      // 生成缩略图
      const thumbnail = await this.generateThumbnail(image);
      
      // 获取图片尺寸信息
      const [originalDimensions, thumbnailDimensions] = await Promise.all([
        this.getImageDimensions(image),
        this.getImageDimensions(thumbnail)
      ]);
      
      return {
        id: entryId,
        originalData: image,
        thumbnailData: thumbnail,
        originalSize: this.getBase64Size(image),
        thumbnailSize: this.getBase64Size(thumbnail),
        type: 'image/jpeg',
        width: originalDimensions.width,
        height: originalDimensions.height,
        thumbnailWidth: thumbnailDimensions.width,
        thumbnailHeight: thumbnailDimensions.height,
        createdAt
      };
    })();

    return Promise.race([processingPromise, timeoutPromise]);
  }

  /**
   * 获取数据条目
   */
  async getEntry(id: string): Promise<DataEntry | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.ENTRIES, STORES.IMAGES], 'readonly');

    try {
      // 获取文本数据
      const entryStore = transaction.objectStore(STORES.ENTRIES);
      const entryResult = await this.promisifyRequest(entryStore.get(id));
      
      if (!entryResult) {
        return null;
      }

      const dbEntry = entryResult as DBEntry;
      
      // 获取图片数据
      const imageStore = transaction.objectStore(STORES.IMAGES);
      const imageResult = await this.promisifyRequest(imageStore.get(id));
      
      const entry: DataEntry = {
        ...dbEntry.data,
        image: imageResult ? (imageResult as DBImage).originalData : undefined
      };

      return entry;
    } catch (error) {
      console.error('Failed to get entry:', error);
      return null;
    }
  }

  /**
   * 获取所有数据条目（用于列表显示，使用缩略图）
   */
  async getAllEntries(): Promise<DataEntry[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.ENTRIES, STORES.IMAGES], 'readonly');

    try {
      const entryStore = transaction.objectStore(STORES.ENTRIES);
      const imageStore = transaction.objectStore(STORES.IMAGES);

      const entryResults = await this.promisifyRequest(entryStore.getAll());
      const entries: DataEntry[] = [];

      for (const dbEntry of entryResults as DBEntry[]) {
        // 获取缩略图（用于列表显示）
        const imageResult = await this.promisifyRequest(imageStore.get(dbEntry.id));
        
        const entry: DataEntry = {
          ...dbEntry.data,
          image: imageResult ? (imageResult as DBImage).thumbnailData : undefined
        };
        
        entries.push(entry);
      }

      return entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Failed to get all entries:', error);
      return [];
    }
  }

  /**
   * 获取所有数据条目（用于导出，包含完整的原图数据）
   */
  async getAllEntriesForExport(): Promise<DataEntry[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.ENTRIES, STORES.IMAGES], 'readonly');

    try {
      const entryStore = transaction.objectStore(STORES.ENTRIES);
      const imageStore = transaction.objectStore(STORES.IMAGES);

      const entryResults = await this.promisifyRequest(entryStore.getAll());
      const entries: DataEntry[] = [];

      for (const dbEntry of entryResults as DBEntry[]) {
        // 获取原图数据（用于导出）
        const imageResult = await this.promisifyRequest(imageStore.get(dbEntry.id));
        
        const entry: DataEntry = {
          ...dbEntry.data,
          image: imageResult ? (imageResult as DBImage).originalData : undefined
        };
        
        entries.push(entry);
      }

      return entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Failed to get all entries for export:', error);
      return [];
    }
  }

  /**
   * 删除数据条目
   */
  async deleteEntry(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.ENTRIES, STORES.IMAGES], 'readwrite');

    try {
      const entryStore = transaction.objectStore(STORES.ENTRIES);
      const imageStore = transaction.objectStore(STORES.IMAGES);

      await Promise.all([
        this.promisifyRequest(entryStore.delete(id)),
        this.promisifyRequest(imageStore.delete(id))
      ]);

      await this.promisifyRequest(transaction);
    } catch (error) {
      transaction.abort();
      throw error;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(key: string, data: TagConfig[] | ExportConfig | any): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.CONFIGS], 'readwrite');

    try {
      const configStore = transaction.objectStore(STORES.CONFIGS);
      const dbConfig: DBConfig = {
        key,
        data,
        updatedAt: new Date().toISOString()
      };
      
      await this.promisifyRequest(configStore.put(dbConfig));
      await this.promisifyRequest(transaction);
    } catch (error) {
      transaction.abort();
      throw error;
    }
  }

  /**
   * 获取配置
   */
  async getConfig<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.CONFIGS], 'readonly');

    try {
      const configStore = transaction.objectStore(STORES.CONFIGS);
      const result = await this.promisifyRequest(configStore.get(key));
      
      return result ? (result as DBConfig).data as T : null;
    } catch (error) {
      console.error('Failed to get config:', error);
      return null;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    entryCount: number;
    imageCount: number;
    totalSize: number;
    imageSize: number;
    thumbnailSize: number;
  }> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.ENTRIES, STORES.IMAGES], 'readonly');

    try {
      const entryStore = transaction.objectStore(STORES.ENTRIES);
      const imageStore = transaction.objectStore(STORES.IMAGES);

      const [entries, images] = await Promise.all([
        this.promisifyRequest(entryStore.getAll()),
        this.promisifyRequest(imageStore.getAll())
      ]);

      const imageSize = (images as DBImage[]).reduce((sum, img) => sum + img.originalSize, 0);
      const thumbnailSize = (images as DBImage[]).reduce((sum, img) => sum + img.thumbnailSize, 0);

      return {
        entryCount: (entries as DBEntry[]).length,
        imageCount: (images as DBImage[]).length,
        totalSize: imageSize + thumbnailSize,
        imageSize,
        thumbnailSize
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        entryCount: 0,
        imageCount: 0,
        totalSize: 0,
        imageSize: 0,
        thumbnailSize: 0
      };
    }
  }

  /**
   * 清理数据库
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORES.ENTRIES, STORES.IMAGES, STORES.CONFIGS], 'readwrite');

    try {
      await Promise.all([
        this.promisifyRequest(transaction.objectStore(STORES.ENTRIES).clear()),
        this.promisifyRequest(transaction.objectStore(STORES.IMAGES).clear()),
        this.promisifyRequest(transaction.objectStore(STORES.CONFIGS).clear())
      ]);

      await this.promisifyRequest(transaction);
    } catch (error) {
      transaction.abort();
      throw error;
    }
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(base64Image: string, maxSize: number = 150): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }
      
      const img = new Image();
      
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('图片处理超时'));
      }, 10000); // 10秒超时

      img.onload = () => {
        try {
          clearTimeout(timeout);
          
          // 计算缩略图尺寸
          const { width, height } = img;
          const ratio = Math.min(maxSize / width, maxSize / height);
          const newWidth = Math.round(width * ratio);
          const newHeight = Math.round(height * ratio);

          canvas.width = newWidth;
          canvas.height = newHeight;

          // 绘制缩略图
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          const result = canvas.toDataURL('image/jpeg', 0.7);
          resolve(result);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('图片加载失败'));
      };

      img.src = base64Image;
    });
  }

  /**
   * 计算Base64字符串大小
   */
  private getBase64Size(base64: string): number {
    const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    return Math.ceil(base64Data.length * 0.75); // Base64编码大约比原始数据大33%
  }

  /**
   * 获取图片尺寸
   */
  private async getImageDimensions(base64Image: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('获取图片尺寸超时'));
      }, 5000); // 5秒超时

      img.onload = () => {
        clearTimeout(timeout);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('无法获取图片尺寸'));
      };

      img.src = base64Image;
    });
  }

  /**
   * 将IDBRequest转换为Promise
   */
  private promisifyRequest<T>(request: IDBRequest<T> | IDBTransaction): Promise<T> {
    return new Promise((resolve, reject) => {
      if ('result' in request) {
        // IDBRequest
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        // IDBTransaction
        request.oncomplete = () => resolve(undefined as T);
        request.onerror = () => reject(request.error);
        request.onabort = () => reject(new Error('Transaction aborted'));
      }
    });
  }
}

// 创建单例实例
export const dbManager = new DatabaseManager();

// 导出类型
export type { DBEntry, DBImage, DBConfig };