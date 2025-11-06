// Performance optimization utility functions

/**
 * Debounce function - for search input and similar scenarios
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function - for scroll events and similar scenarios
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Paginate large datasets
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): {
  items: T[];
  total: number;
  hasMore: boolean;
} {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = data.slice(startIndex, endIndex);
  
  return {
    items,
    total: data.length,
    hasMore: endIndex < data.length
  };
}

/**
 * Calculate visible items for virtual scrolling
 */
export function calculateVisibleItems(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
): {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
} {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2);
  
  return {
    startIndex,
    endIndex,
    visibleItems
  };
}

/**
 * Image lazy loading
 */
export function createImageLoader(): {
  loadImage: (src: string) => Promise<string>;
  preloadImages: (srcs: string[]) => Promise<string[]>;
} {
  const imageCache = new Map<string, Promise<string>>();
  
  const loadImage = (src: string): Promise<string> => {
    if (imageCache.has(src)) {
      return imageCache.get(src)!;
    }
    
    const promise = new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = reject;
      img.src = src;
    });
    
    imageCache.set(src, promise);
    return promise;
  };
  
  const preloadImages = (srcs: string[]): Promise<string[]> => {
    return Promise.all(srcs.map(loadImage));
  };
  
  return { loadImage, preloadImages };
}

/**
 * 内存使用监控
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }
  return null;
}

/**
 * 文件大小格式化
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 大文件分块处理
 */
export async function processFileInChunks<T>(
  data: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await processor(chunk);
    
    // Allow other tasks to run
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * Storage Performance Optimization
 */
import { DataEntry } from '../types';
import { dbManager } from './database';
import { getStorageInfo, cleanupExpiredData } from './compression';

interface StorageMetrics {
  indexedDBSize: number;
  localStorageSize: number;
  totalEntries: number;
  averageEntrySize: number;
  compressionRatio: number;
  queryPerformance: {
    averageQueryTime: number;
    slowQueries: number;
  };
}

interface OptimizationResult {
  success: boolean;
  message: string;
  optimizations: string[];
  sizeBefore: number;
  sizeAfter: number;
}

/**
 * 获取存储性能指标
 */
export async function getStorageMetrics(): Promise<StorageMetrics> {
  console.log('正在收集存储性能指标...');

  try {
    const storageInfo = getStorageInfo();
    
    const startTime = performance.now();
    const entries = await dbManager.getAllEntries();
    const queryTime = performance.now() - startTime;

    let totalSize = 0;
    let compressionSavings = 0;
    
    for (const entry of entries) {
      const entrySize = JSON.stringify(entry).length;
      totalSize += entrySize;
      
      const compressedSize = Math.round(entrySize * 0.6);
      compressionSavings += (entrySize - compressedSize);
    }

    const averageEntrySize = entries.length > 0 ? totalSize / entries.length : 0;
    const compressionRatio = totalSize > 0 ? compressionSavings / totalSize : 0;

    return {
      indexedDBSize: totalSize,
      localStorageSize: storageInfo.used,
      totalEntries: entries.length,
      averageEntrySize,
      compressionRatio,
      queryPerformance: {
        averageQueryTime: queryTime,
        slowQueries: queryTime > 100 ? 1 : 0
      }
    };
  } catch (error) {
    console.error('获取存储指标失败:', error);
    throw error;
  }
}

/**
 * 优化存储性能
 */
export async function optimizeStorage(): Promise<OptimizationResult> {
  console.log('开始存储性能优化...');

  const beforeMetrics = await getStorageMetrics();
  const optimizations: string[] = [];

  try {
    // 清理过期数据
    cleanupExpiredData();
    optimizations.push('清理过期数据');

    // 优化大型条目
    const entries = await dbManager.getAllEntries();
    let optimizedCount = 0;
    
    for (const entry of entries) {
      const entrySize = JSON.stringify(entry).length;
      
      if (entrySize > 1024 * 1024) { // 1MB
        if (entry.history && entry.history.length > 3) {
          entry.history = entry.history.slice(-3);
          await dbManager.saveEntry(entry);
          optimizedCount++;
        }
      }
    }
    
    if (optimizedCount > 0) {
      optimizations.push(`优化了 ${optimizedCount} 个大型条目`);
    }

    // 清理临时存储
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      optimizations.push(`清理了 ${keysToRemove.length} 个临时存储项`);
    }

    const afterMetrics = await getStorageMetrics();

    return {
      success: true,
      message: '存储优化完成',
      optimizations,
      sizeBefore: beforeMetrics.localStorageSize + beforeMetrics.indexedDBSize,
      sizeAfter: afterMetrics.localStorageSize + afterMetrics.indexedDBSize
    };
  } catch (error) {
    console.error('存储优化失败:', error);
    return {
      success: false,
      message: `存储优化失败: ${error instanceof Error ? error.message : '未知错误'}`,
      optimizations,
      sizeBefore: beforeMetrics.localStorageSize + beforeMetrics.indexedDBSize,
      sizeAfter: beforeMetrics.localStorageSize + beforeMetrics.indexedDBSize
    };
  }
}

/**
 * 生成存储性能报告
 */
export function generateStorageReport(metrics: StorageMetrics): string {
  return `
存储性能报告
============
总条目数: ${metrics.totalEntries}
平均条目大小: ${formatFileSize(metrics.averageEntrySize)}
压缩率: ${(metrics.compressionRatio * 100).toFixed(1)}%
IndexedDB 大小: ${formatFileSize(metrics.indexedDBSize)}
LocalStorage 大小: ${formatFileSize(metrics.localStorageSize)}
平均查询时间: ${metrics.queryPerformance.averageQueryTime.toFixed(2)} ms
慢查询数量: ${metrics.queryPerformance.slowQueries}

建议:
${metrics.queryPerformance.averageQueryTime > 100 ? '- 查询性能较慢，建议优化索引\n' : ''}
${metrics.averageEntrySize > 1024 * 1024 ? '- 条目大小较大，建议压缩数据\n' : ''}
${metrics.localStorageSize / (5 * 1024 * 1024) > 0.8 ? '- 存储使用率较高，建议清理数据\n' : ''}
  `.trim();
}