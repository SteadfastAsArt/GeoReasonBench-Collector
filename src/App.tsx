import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Spin, message } from 'antd';
import {
  DatabaseOutlined,
  EditOutlined,
  BarChartOutlined,
  ExportOutlined,
  SettingOutlined
} from '@ant-design/icons';
import DataEntryPage from './pages/DataEntryPage';
import DataEditPage from './pages/DataEditPage';
import VisualizationPage from './pages/VisualizationPage';
import ExportPage from './pages/ExportPage';
import TagConfigPage from './pages/TagConfigPage';

import { DataEntry, TagConfig, AppState, FilterCondition, ExportConfig } from './types';
import { generateId } from './utils';
import { storageAdapter } from './utils/storage-adapter';
import './App.css';

const { Header, Sider, Content } = Layout;

// Default configurations
const getDefaultTagConfigs = (): TagConfig[] => [
  {
    id: 'difficulty',
    name: 'Difficulty Level',
    label: 'Difficulty',
    type: 'select',
    options: ['Easy', 'Medium', 'Hard'],
    required: true,
    description: 'Difficulty level of the question'
  },
  {
    id: 'category',
    name: 'Question Type',
    label: 'Type',
    type: 'multiSelect',
    options: ['Geographic Reasoning', 'Spatial Analysis', 'Map Reading', 'Data Analysis'],
    required: false,
    description: 'Category classification of the question'
  },
  {
    id: 'keywords',
    name: 'Keywords',
    label: 'Keywords',
    type: 'input',
    required: false,
    description: 'Keywords related to the question'
  }
];

const getInitialAppState = (): AppState => {
  // 返回默认状态，数据将异步加载
  return {
    dataEntries: [],
    tagConfigs: getDefaultTagConfigs(),
    currentEntry: null,
    filterCondition: {
      tags: {},
      keyword: '',
      dateRange: null,
      hasImage: null
    },
    exportConfig: {
      format: 'json',
      imagePath: './images',
      includeHistory: false,
      exportImages: false,
      exportFormat: 'zip'
    },
    statistics: {
      totalEntries: 0,
      completedEntries: 0,
      tagDistribution: {},
      fieldCompleteness: {
        image: 0,
        query: 0,
        solution: 0,
        gt_answer: 0
      },
      timeSeriesData: []
    }
  };
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('entry');
  const [appState, setAppState] = useState<AppState>(getInitialAppState());
  const [isLoading, setIsLoading] = useState(true);

  // 初始化数据加载
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // 并行加载所有数据
        const [entries, tagConfigs, exportConfig] = await Promise.all([
          storageAdapter.getAllEntries(),
          storageAdapter.getConfig<TagConfig[]>('tagConfigs'),
          storageAdapter.getConfig<ExportConfig>('exportConfig')
        ]);

        setAppState(prev => ({
          ...prev,
          dataEntries: entries || [],
          tagConfigs: tagConfigs && tagConfigs.length > 0 ? tagConfigs : getDefaultTagConfigs(),
          exportConfig: exportConfig || prev.exportConfig
        }));
      } catch (error) {
        console.error('加载初始数据失败:', error);
        message.error('数据加载失败，请刷新页面重试');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 保存配置数据
  useEffect(() => {
    if (!isLoading) {
      storageAdapter.saveConfig('tagConfigs', appState.tagConfigs);
      storageAdapter.saveConfig('exportConfig', appState.exportConfig);
    }
  }, [appState.tagConfigs, appState.exportConfig, isLoading]);

  // 更新统计数据
  useEffect(() => {
    if (!isLoading) {
      updateStatistics();
    }
  }, [appState.dataEntries, isLoading]);

  // Update statistics data
  const updateStatistics = () => {
    const { dataEntries, tagConfigs } = appState;
    const totalEntries = dataEntries.length;
    const completedEntries = dataEntries.filter(entry => 
      entry.query && entry.gt_answer
    ).length;

    const tagDistribution: Record<string, number> = {};
    const fieldCompleteness = {
      image: 0,
      query: 0,
      solution: 0,
      gt_answer: 0
    };

    dataEntries.forEach(entry => {
      // Count field completeness
      if (entry.image) fieldCompleteness.image++;
      if (entry.query) fieldCompleteness.query++;
      if (entry.solution) fieldCompleteness.solution++;
      if (entry.gt_answer) fieldCompleteness.gt_answer++;

      // Count tag distribution
      Object.entries(entry.tags).forEach(([key, value]) => {
        if (value) {
          tagDistribution[key] = (tagDistribution[key] || 0) + 1;
        }
      });
    });

    // Calculate time series data
    const timeSeriesData = dataEntries.reduce((acc, entry) => {
      const date = entry.createdAt.split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as { date: string; count: number }[]);

    setAppState(prev => ({
      ...prev,
      statistics: {
        totalEntries,
        completedEntries,
        tagDistribution,
        fieldCompleteness,
        timeSeriesData: timeSeriesData.sort((a, b) => a.date.localeCompare(b.date))
      }
    }));
  };

  // Save data entry
  const handleSaveEntry = async (entry: DataEntry) => {
    console.log('App: Starting to save entry', entry.id);
    
    try {
      // 验证entry数据
      if (!entry) {
        throw new Error('数据条目不能为空');
      }
      
      if (!entry.query || entry.query.trim() === '') {
        throw new Error('问题内容不能为空');
      }
      
      const existingIndex = appState.dataEntries.findIndex(e => e.id === entry.id);
      let savedEntry;
      
      if (existingIndex >= 0) {
        console.log('App: Updating existing entry');
        // Update existing entry
        const oldEntry = appState.dataEntries[existingIndex];
        savedEntry = {
           ...entry,
           updatedAt: new Date().toISOString(),
           version: (oldEntry.version || 1) + 1,
           history: [
             ...(oldEntry.history || []),
             {
               version: oldEntry.version || 1,
               data: oldEntry,
               timestamp: new Date().toISOString(),
               action: 'update' as const
             }
           ]
         };
      } else {
        console.log('App: Creating new entry');
        // Add new entry
        savedEntry = {
          ...entry,
          id: entry.id || generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          history: []
        };
      }

      console.log('App: Calling storageAdapter.saveEntry');
      await storageAdapter.saveEntry(savedEntry);
      console.log('App: Storage save completed successfully');
      
      const newEntries = existingIndex >= 0 
        ? appState.dataEntries.map((e, i) => i === existingIndex ? savedEntry : e)
        : [...appState.dataEntries, savedEntry];

      setAppState(prev => ({ ...prev, dataEntries: newEntries }));
      console.log('App: State updated successfully');
      message.success('数据保存成功');
    } catch (error) {
      console.error('App: 保存数据条目失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '数据保存失败';
      if (error instanceof Error) {
        if (error.message.includes('localStorage')) {
          errorMessage = '存储空间不足或localStorage不可用，请清理浏览器数据后重试';
        } else if (error.message.includes('IndexedDB')) {
          errorMessage = 'IndexedDB连接失败，请检查浏览器设置或切换到localStorage模式';
        } else if (error.message.includes('数据条目不能为空') || error.message.includes('问题内容不能为空')) {
          errorMessage = error.message;
        } else {
          errorMessage = `保存失败: ${error.message}`;
        }
      }
      
      message.error(errorMessage);
      
      // 如果是存储相关错误，建议用户使用调试页面
      if (error instanceof Error && (error.message.includes('Storage') || error.message.includes('IndexedDB'))) {
        setTimeout(() => {
          message.info('建议使用"调试工具"页面检查存储状态');
        }, 2000);
      }
    }
  };

  // 删除数据条目
  const handleDeleteEntry = async (id: string) => {
    try {
      await storageAdapter.deleteEntry(id);
      const newEntries = appState.dataEntries.filter(entry => entry.id !== id);
      setAppState(prev => ({ ...prev, dataEntries: newEntries }));
      message.success('数据删除成功');
    } catch (error) {
      console.error('删除数据条目失败:', error);
      message.error('数据删除失败，请重试');
    }
  };

  // 编辑数据条目
  const handleEditEntry = (entry: DataEntry) => {
    setAppState(prev => ({ ...prev, currentEntry: entry }));
    setCurrentPage('edit');
  };

  // 筛选数据
  const handleFilter = (condition: FilterCondition) => {
    setAppState(prev => ({ ...prev, filterCondition: condition }));
  };

  // 导出数据
  const handleExport = (config: ExportConfig) => {
    setAppState(prev => ({ ...prev, exportConfig: config }));
    message.success('导出配置已保存');
  };

  // 更新标签配置
  const handleUpdateTagConfigs = (tagConfigs: TagConfig[]) => {
    setAppState(prev => ({ ...prev, tagConfigs }));
  };

  const menuItems = [
    {
      key: 'entry',
      icon: <DatabaseOutlined />,
      label: 'Data Entry'
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Data Management'
    },
    {
      key: 'visualization',
      icon: <BarChartOutlined />,
      label: 'Data Visualization'
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Data Export'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Tag Configuration'
    }
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'entry':
        return (
          <DataEntryPage
            tagConfigs={appState.tagConfigs}
            onSave={handleSaveEntry}
          />
        );
      case 'edit':
        return (
          <DataEditPage
            entries={appState.dataEntries}
            tagConfigs={appState.tagConfigs}
            currentEntry={appState.currentEntry}
            filterCondition={appState.filterCondition}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onFilter={handleFilter}
            onSave={handleSaveEntry}
          />
        );
      case 'visualization':
        return (
          <VisualizationPage
            statistics={appState.statistics}
            entries={appState.dataEntries}
          />
        );
      case 'export':
        return (
          <ExportPage
            entries={appState.dataEntries}
            exportConfig={appState.exportConfig}
            onExport={handleExport}
          />
        );

      case 'settings':
        return (
          <TagConfigPage
            tagConfigs={appState.tagConfigs}
            onUpdateTagConfigs={handleUpdateTagConfigs}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, fontSize: 16 }}>Loading data...</div>
      </div>
    );
  }

  return (
    <Layout className="main-layout" style={{ height: '100vh' }}>
      <Header>
        <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 'bold' }}>
          GeoReasonBench Data Collection System
        </div>
      </Header>
      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        <Sider width={200}>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => setCurrentPage(key)}
          />
        </Sider>
        <Layout style={{ padding: '0' }}>
          <Content className="content-area" style={{ 
            padding: 'var(--spacing-lg)', 
            height: '100%',
            overflow: 'auto'
          }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;