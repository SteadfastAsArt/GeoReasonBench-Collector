/**
 * 本地文件存储后端服务
 * 提供真正的文件系统操作，绕过浏览器存储限制
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// 数据目录路径
const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json');

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 确保目录存在
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    console.log('数据目录已创建或已存在');
  } catch (error) {
    console.error('创建数据目录失败:', error);
  }
}

// 初始化数据文件
async function initializeDataFile() {
  try {
    await fs.access(ENTRIES_FILE);
  } catch (error) {
    // 文件不存在，创建初始文件
    const initialData = {
      entries: {},
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entryCount: 0
      }
    };
    await fs.writeFile(ENTRIES_FILE, JSON.stringify(initialData, null, 2));
    console.log('初始数据文件已创建');
  }
}

// 读取数据文件
async function readDataFile() {
  try {
    const data = await fs.readFile(ENTRIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取数据文件失败:', error);
    return {
      entries: {},
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entryCount: 0
      }
    };
  }
}

// 写入数据文件
async function writeDataFile(data) {
  try {
    data.metadata.lastUpdated = new Date().toISOString();
    data.metadata.entryCount = Object.keys(data.entries).length;
    await fs.writeFile(ENTRIES_FILE, JSON.stringify(data, null, 2));
    console.log('数据文件已保存');
  } catch (error) {
    console.error('写入数据文件失败:', error);
    throw error;
  }
}

// 保存图片文件
async function saveImageFile(entryId, imageData) {
  try {
    // 移除 data:image/jpeg;base64, 前缀
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const imagePath = path.join(IMAGES_DIR, `${entryId}.jpg`);
    await fs.writeFile(imagePath, buffer);
    return `images/${entryId}.jpg`;
  } catch (error) {
    console.error('保存图片文件失败:', error);
    throw error;
  }
}

// 读取图片文件
async function readImageFile(entryId) {
  try {
    const imagePath = path.join(IMAGES_DIR, `${entryId}.jpg`);
    const buffer = await fs.readFile(imagePath);
    const base64Data = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64Data}`;
  } catch (error) {
    console.error('读取图片文件失败:', error);
    return null;
  }
}

// API 路由

// 获取所有数据条目
app.get('/api/entries', async (req, res) => {
  try {
    const data = await readDataFile();
    const entries = [];
    
    for (const [id, entry] of Object.entries(data.entries)) {
      const entryWithImage = { ...entry };
      if (entry.image && entry.image.startsWith('images/')) {
        // 加载图片数据
        const imageData = await readImageFile(id);
        if (imageData) {
          entryWithImage.image = imageData;
        }
      }
      entries.push(entryWithImage);
    }
    
    res.json(entries);
  } catch (error) {
    console.error('获取数据条目失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 获取单个数据条目
app.get('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readDataFile();
    const entry = data.entries[id];
    
    if (!entry) {
      return res.status(404).json({ error: '数据条目不存在' });
    }
    
    const entryWithImage = { ...entry };
    if (entry.image && entry.image.startsWith('images/')) {
      const imageData = await readImageFile(id);
      if (imageData) {
        entryWithImage.image = imageData;
      }
    }
    
    res.json(entryWithImage);
  } catch (error) {
    console.error('获取数据条目失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 保存数据条目
app.post('/api/entries', async (req, res) => {
  try {
    const entry = req.body;
    const data = await readDataFile();
    
    // 处理图片数据
    if (entry.image && entry.image.startsWith('data:image/')) {
      const imagePath = await saveImageFile(entry.id, entry.image);
      entry.image = imagePath;
    }
    
    // 保存条目数据
    data.entries[entry.id] = entry;
    await writeDataFile(data);
    
    console.log(`数据条目已保存: ${entry.id}`);
    res.json({ success: true, id: entry.id });
  } catch (error) {
    console.error('保存数据条目失败:', error);
    res.status(500).json({ error: '保存数据失败' });
  }
});

// 删除数据条目
app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readDataFile();
    
    if (!data.entries[id]) {
      return res.status(404).json({ error: '数据条目不存在' });
    }
    
    // 删除图片文件
    try {
      const imagePath = path.join(IMAGES_DIR, `${id}.jpg`);
      await fs.unlink(imagePath);
    } catch (error) {
      console.log('图片文件不存在或删除失败:', error.message);
    }
    
    // 删除条目数据
    delete data.entries[id];
    await writeDataFile(data);
    
    console.log(`数据条目已删除: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('删除数据条目失败:', error);
    res.status(500).json({ error: '删除数据失败' });
  }
});

// 保存配置
app.post('/api/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body;
    const configPath = path.join(DATA_DIR, `${key}.json`);
    await fs.writeFile(configPath, JSON.stringify(value, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({ error: '保存配置失败' });
  }
});

// 获取配置
app.get('/api/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const configPath = path.join(DATA_DIR, `${key}.json`);
    const data = await fs.readFile(configPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: '配置不存在' });
  }
});

// 获取存储统计
app.get('/api/stats', async (req, res) => {
  try {
    const data = await readDataFile();
    const stats = {
      mode: 'localFile',
      entryCount: Object.keys(data.entries).length,
      totalSize: 0,
      imageCount: 0
    };
    
    // 计算总大小
    try {
      const entriesStats = await fs.stat(ENTRIES_FILE);
      stats.totalSize += entriesStats.size;
      
      const imageFiles = await fs.readdir(IMAGES_DIR);
      stats.imageCount = imageFiles.length;
      
      for (const file of imageFiles) {
        const filePath = path.join(IMAGES_DIR, file);
        const fileStats = await fs.stat(filePath);
        stats.totalSize += fileStats.size;
      }
    } catch (error) {
      console.error('计算存储统计失败:', error);
    }
    
    res.json(stats);
  } catch (error) {
    console.error('获取存储统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 清空所有数据
app.delete('/api/clear', async (req, res) => {
  try {
    // 删除所有图片文件
    try {
      const imageFiles = await fs.readdir(IMAGES_DIR);
      for (const file of imageFiles) {
        await fs.unlink(path.join(IMAGES_DIR, file));
      }
    } catch (error) {
      console.log('清理图片文件失败:', error.message);
    }
    
    // 重置数据文件
    const initialData = {
      entries: {},
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entryCount: 0
      }
    };
    await writeDataFile(initialData);
    
    console.log('所有数据已清空');
    res.json({ success: true });
  } catch (error) {
    console.error('清空数据失败:', error);
    res.status(500).json({ error: '清空数据失败' });
  }
});

// 启动服务器
async function startServer() {
  await ensureDirectories();
  await initializeDataFile();
  
  app.listen(PORT, () => {
    console.log(`🚀 本地文件存储服务已启动: http://localhost:${PORT}`);
    console.log(`📁 数据目录: ${DATA_DIR}`);
    console.log(`🖼️  图片目录: ${IMAGES_DIR}`);
  });
}

startServer().catch(console.error);