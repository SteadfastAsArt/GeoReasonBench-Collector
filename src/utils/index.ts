import { DataEntry, OpenAIConversation, ExportConfig } from '../types';

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Storage utilities with compression
import { setCompressedItem, getCompressedItem } from './compression';

export const saveToStorage = (key: string, data: any) => {
  try {
    setCompressedItem(key, data);
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
};

export const loadFromStorage = (key: string) => {
  try {
    return getCompressedItem(key);
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return null;
  }
};

// Image processing tools
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const pasteImageFromClipboard = async (): Promise<string | null> => {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          const blob = await clipboardItem.getType(type);
          return readFileAsDataURL(new File([blob], 'clipboard-image', { type }));
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to read image from clipboard:', error);
    return null;
  }
};

// Image compression - preserves original resolution, only compresses quality
export const compressImage = (
  file: File,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 添加超时处理
    const timeout = setTimeout(() => {
      reject(new Error('图片压缩超时'));
    }, 10000); // 10秒超时

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      clearTimeout(timeout);
      reject(new Error('无法创建Canvas上下文'));
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      try {
        clearTimeout(timeout);
        
        // Preserve original dimensions
        const { width, height } = img;
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image with original size and compress only quality
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL('image/jpeg', quality);
        
        // 清理资源
        URL.revokeObjectURL(img.src);
        
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`图片压缩失败: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(img.src);
      reject(new Error('图片加载失败'));
    };
    
    try {
      img.src = URL.createObjectURL(file);
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`创建图片URL失败: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
};

// Optional: Image compression with size reduction (if needed)
export const compressImageWithResize = (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 添加超时处理
    const timeout = setTimeout(() => {
      reject(new Error('图片压缩超时'));
    }, 10000); // 10秒超时

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      clearTimeout(timeout);
      reject(new Error('无法创建Canvas上下文'));
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      try {
        clearTimeout(timeout);
        
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress with new dimensions
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL('image/jpeg', quality);
        
        // 清理资源
        URL.revokeObjectURL(img.src);
        
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`图片压缩失败: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(img.src);
      reject(new Error('图片加载失败'));
    };
    
    try {
      img.src = URL.createObjectURL(file);
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`创建图片URL失败: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
};

// Data validation
export const validateDataEntry = (entry: Partial<DataEntry>): string[] => {
  const errors: string[] = [];
  
  if (!entry.query || entry.query.trim() === '') {
    errors.push('Query content cannot be empty');
  }
  
  if (!entry.gt_answer || entry.gt_answer.trim() === '') {
    errors.push('Ground truth answer cannot be empty');
  }
  
  return errors;
};

// Base64转图片文件
export const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg'): Blob => {
  // 移除data:image/jpeg;base64,前缀
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// 下载单个图片文件
export const downloadImageFile = (base64: string, filename: string): void => {
  const blob = base64ToBlob(base64);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 批量导出图片文件（打包成ZIP）
export const exportImagesAsZip = async (entries: DataEntry[], imagePath: string = 'images'): Promise<void> => {
  // 动态导入JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const imageFolder = zip.folder(imagePath.replace('./', ''));
  
  // 添加图片到ZIP
  entries.forEach(entry => {
    if (entry.image) {
      const blob = base64ToBlob(entry.image);
      imageFolder?.file(`${entry.id}.jpg`, blob);
    }
  });
  
  // 生成ZIP文件并下载
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'images.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 数据导出工具
export const exportToJSON = (
  entries: DataEntry[],
  config: ExportConfig
): string => {
  const exportData = entries.map(entry => ({
    ...entry,
    image: entry.image ? `${config.imagePath}/${entry.id}.jpg` : undefined,
    history: config.includeHistory ? entry.history : undefined
  }));
  
  return JSON.stringify(exportData, null, 2);
};

// 导出数据和图片文件
export const exportDataWithImages = async (
  entries: DataEntry[],
  config: ExportConfig & { exportImages?: boolean; exportFormat?: 'zip' | 'separate' }
): Promise<void> => {
  // 导出JSON数据
  const jsonData = config.format === 'openai' 
    ? exportToOpenAI(entries, config)
    : exportToJSON(entries, config);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const jsonFilename = `georeasonbench_data_${timestamp}.json`;
  
  if (config.exportImages && entries.some(entry => entry.image)) {
    if (config.exportFormat === 'zip') {
      // 创建包含JSON和图片的ZIP文件
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // 添加JSON文件
      zip.file(jsonFilename, jsonData);
      
      // 添加图片文件夹
      // 确保文件夹路径与JSON中的路径一致
      const folderPath = config.imagePath.startsWith('./') 
        ? config.imagePath.substring(2) 
        : config.imagePath;
      const imageFolder = zip.folder(folderPath);
      entries.forEach(entry => {
        if (entry.image) {
          const blob = base64ToBlob(entry.image);
          imageFolder?.file(`${entry.id}.jpg`, blob);
        }
      });
      
      // 下载ZIP文件
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `georeasonbench_export_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // 分别下载JSON和图片ZIP
      downloadFile(jsonData, jsonFilename);
      await exportImagesAsZip(entries, config.imagePath);
    }
  } else {
    // 只下载JSON文件
    downloadFile(jsonData, jsonFilename);
  }
};

export const exportToOpenAI = (
  entries: DataEntry[],
  config: ExportConfig
): string => {
  const conversations: OpenAIConversation[] = entries.map(entry => {
    const messages = [];
    
    // 系统消息（如果有solution）
    if (entry.solution) {
      messages.push({
        role: 'system' as const,
        content: entry.solution
      });
    }
    
    // 用户消息
    const userContent = [];
    if (entry.query) {
      userContent.push({
        type: 'text' as const,
        text: entry.query
      });
    }
    if (entry.image) {
      userContent.push({
        type: 'image_url' as const,
        image_url: {
          url: `${config.imagePath}/${entry.id}.jpg`
        }
      });
    }
    
    messages.push({
      role: 'user' as const,
      content: userContent
    });
    
    // 助手回复
    messages.push({
      role: 'assistant' as const,
      content: entry.gt_answer
    });
    
    return { messages };
  });
  
  return JSON.stringify(conversations, null, 2);
};

// 文件下载
export const downloadFile = (content: string, filename: string, type: string = 'application/json'): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 日期格式化
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 文本截断
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 深拷贝
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};