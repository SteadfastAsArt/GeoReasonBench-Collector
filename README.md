# GeoReasonBench Collector

🌍 专业的地理推理数据集收集与管理平台

![GitHub repo size](https://img.shields.io/github/repo-size/SteadfastAsArt/GeoReasonBench-Collector)
![GitHub stars](https://img.shields.io/github/stars/SteadfastAsArt/GeoReasonBench-Collector?style=flat)
![GitHub issues](https://img.shields.io/github/issues/SteadfastAsArt/GeoReasonBench-Collector)
![License](https://img.shields.io/github/license/SteadfastAsArt/GeoReasonBench-Collector)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0-brightgreen)
![React](https://img.shields.io/badge/react-%5E18.2.0-blue)
![TypeScript](https://img.shields.io/badge/typescript-%5E5.0.0-blue)
![Vite](https://img.shields.io/badge/vite-%5E4.4.0-purple)
![Ant Design](https://img.shields.io/badge/ant%20design-%5E5.0.0-blue)

## 🎯 关于项目

GeoReasonBench Collector 是一个专为地理推理基准数据集设计的数据收集与管理工具。它提供了一个用户友好的 Web 界面，用于高效地录入、编辑、标注和管理地理问题及其相关数据。

### 🌟 项目亮点

- **🎨 现代化界面**: 基于 Ant Design 的美观用户界面
- **⚡ 高性能**: 采用 React + Vite 构建，加载速度快
- **📱 响应式设计**: 适配各种屏幕尺寸
- **🔒 数据安全**: 本地存储确保数据隐私

### 🏗️ 技术栈

- **前端**: React, TypeScript, Vite, Ant Design
- **后端**: Express, Node.js
- **数据可视化**: ECharts, D3.js
- **开发工具**: ESLint, Prettier

## 🚀 快速开始

### 📋 环境要求

- Node.js (版本 16.0 或更高)
- npm 或 yarn 包管理器

### 🔧 安装指南

1. **克隆项目**
   ```bash
   git clone https://github.com/SteadfastAsArt/GeoReasonBench-Collector.git
   cd GeoReasonBench-Collector
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发环境**
   ```bash
   # 同时启动前端和后端服务
   npm run dev:full
   ```

4. **访问应用**
   - 前端应用: `http://localhost:3000`
   - 后端服务: `http://localhost:3002`

## ✨ 核心功能

### 📝 数据录入与管理
- **智能表单**: 支持 Markdown 和 LaTeX 公式
- **图片上传**: 拖拽上传和预览功能
- **实时验证**: 输入数据实时校验

### 🏷️ 标签系统
- **灵活配置**: 支持多种标签类型（单选、多选、输入框）
- **动态验证**: 根据标签类型自动验证
- **批量操作**: 支持批量标签编辑

### 📊 数据可视化
- **统计图表**: 数据分布、完成度统计
- **时间序列**: 数据录入趋势分析
- **交互式图表**: 支持图表交互和筛选

### 💾 数据导入导出
- **多种格式**: 支持 JSON、CSV、ZIP 格式
- **图片打包**: 自动打包关联图片
- **配置导出**: 导出标签配置和数据

## 📁 项目结构

```
GeoReasonBench-Collector/
├── data/                    # 数据存储目录
├── src/                     # 前端源代码
│   ├── components/          # React 组件
│   ├── pages/              # 页面组件
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
├── server.js               # 后端服务
└── package.json            # 项目配置
```

## 🗺️ 开发路线图

- [x] 基础数据录入功能
- [x] 数据管理和编辑
- [x] Markdown 编辑器集成
- [x] 标签系统
- [x] 数据可视化
- [x] 数据导入导出
- [ ] 用户权限管理
- [ ] 协作编辑功能
- [ ] 高级搜索和筛选

## 🤝 贡献指南

1. Fork 这个项目
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

根据 MIT 许可证分发。更多信息请参见 [LICENSE](LICENSE) 文件。