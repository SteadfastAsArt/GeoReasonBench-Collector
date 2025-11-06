/**
 * 真正的本地文件存储管理器
 * 通过后端 API 实现真正的文件系统操作，完全绕过浏览器存储限制
 */

import { DataEntry, ExportConfig } from '../types';

const API_BASE_URL = 'http://localhost:3002/api';

export class TrueLocalStorageManager {
  private isInitialized = false;
  private serverAvailable = false;

  /**
   * 初始化存储管理器
   */
  async initialize(): Promise<boolean> {
    try {
      // 检查后端服务是否可用
      const response = await fetch(`${API_BASE_URL}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        this.serverAvailable = true;
        this.isInitialized = true;
        console.log('✅ 真正的本地文件存储已初始化');
        return true;
      } else {
        throw new Error('后端服务不可用');
      }
    } catch (error) {
      console.error('❌ 真正的本地文件存储初始化失败:', error);
      this.serverAvailable = false;
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.serverAvailable;
  }

  /**
   * 保存数据条目
   */
  async saveEntry(entry: DataEntry): Promise<void> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存失败');
      }

      console.log(`✅ 数据条目已保存到本地文件: ${entry.id}`);
    } catch (error) {
      console.error('❌ 保存数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个数据条目
   */
  async getEntry(id: string): Promise<DataEntry | null> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/entries/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取失败');
      }

      const entry = await response.json();
      console.log(`✅ 从本地文件加载数据条目: ${id}`);
      return entry;
    } catch (error) {
      console.error('❌ 获取数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有数据条目
   */
  async getAllEntries(): Promise<DataEntry[]> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/entries`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取失败');
      }

      const entries = await response.json();
      console.log(`✅ 从本地文件加载 ${entries.length} 个数据条目`);
      return entries;
    } catch (error) {
      console.error('❌ 获取所有数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有数据条目用于导出
   */
  async getAllEntriesForExport(): Promise<DataEntry[]> {
    // 导出功能与获取所有条目相同
    return this.getAllEntries();
  }

  /**
   * 删除数据条目
   */
  async deleteEntry(id: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/entries/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }

      console.log(`✅ 数据条目已从本地文件删除: ${id}`);
    } catch (error) {
      console.error('❌ 删除数据条目失败:', error);
      throw error;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(key: string, config: any): Promise<void> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/config/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存配置失败');
      }

      console.log(`✅ 配置已保存到本地文件: ${key}`);
    } catch (error) {
      console.error('❌ 保存配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  async getConfig(key: string): Promise<any> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/config/${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取配置失败');
      }

      const config = await response.json();
      console.log(`✅ 从本地文件加载配置: ${key}`);
      return config;
    } catch (error) {
      console.error('❌ 获取配置失败:', error);
      return null;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<any> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取统计失败');
      }

      const stats = await response.json();
      console.log('✅ 获取本地文件存储统计信息');
      return stats;
    } catch (error) {
      console.error('❌ 获取存储统计失败:', error);
      throw error;
    }
  }

  /**
   * 清理存储
   */
  async cleanupStorage(): Promise<void> {
    // 真正的文件存储不需要清理
    console.log('✅ 本地文件存储无需清理');
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    if (!this.isReady()) {
      throw new Error('存储管理器未初始化');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '清空失败');
      }

      console.log('✅ 所有本地文件数据已清空');
    } catch (error) {
      console.error('❌ 清空数据失败:', error);
      throw error;
    }
  }

  /**
   * 检查后端服务状态
   */
  async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// 创建单例实例
export const trueLocalStorageManager = new TrueLocalStorageManager();