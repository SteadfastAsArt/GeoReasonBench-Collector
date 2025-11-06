import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Space, 
  Typography, 
  Table, 
  Modal, 
  message,
  Statistic,
  Badge,
  Tooltip,
  Alert,
  Descriptions,
  Tag,
  Progress
} from 'antd';
import { 
  FolderOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  ImportOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  FileOutlined,
  PictureOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { storageAdapter } from '../utils/storage-adapter';

const { Title, Text, Paragraph } = Typography;

interface StorageStats {
  mode: string;
  entryCount: number;
  imageCount?: number;
  totalSize: number;
  imageSize?: number;
  dataPath?: string;
}

interface FileSystemInfo {
  dataDirectory: string;
  entriesFile: string;
  imagesDirectory: string;
  configFiles: string[];
  backendStatus: 'connected' | 'disconnected' | 'error';
}

const StorageManagementPage: React.FC = () => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [fileSystemInfo, setFileSystemInfo] = useState<FileSystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const updateStats = async () => {
    try {
      const storageStats = await storageAdapter.getStorageStats();
      setStats(storageStats);
      
      // 检查后端连接状态
      try {
        const response = await fetch('http://localhost:3001/api/status');
        if (response.ok) {
          const data = await response.json();
          setFileSystemInfo({
            dataDirectory: data.dataPath || '/data',
            entriesFile: 'entries.json',
            imagesDirectory: 'images/',
            configFiles: ['exportConfig.json', 'tagConfigs.json'],
            backendStatus: 'connected'
          });
        } else {
          setFileSystemInfo(prev => prev ? { ...prev, backendStatus: 'error' } : null);
        }
      } catch (error) {
        setFileSystemInfo(prev => prev ? { ...prev, backendStatus: 'disconnected' } : null);
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
      message.error('Failed to get storage statistics');
    }
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await updateStats();
    setRefreshing(false);
    message.success('Storage information refreshed');
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const entries = await storageAdapter.getAllEntriesForExport();
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          entryCount: entries.length
        },
        entries: entries
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `georeasonbench-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success(`Data export completed - ${entries.length} entries`);
      } catch (error) {
        message.error('Data export failed');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    Modal.confirm({
      title: 'Confirm Data Cleanup',
        content: 'This will delete all data entries and image files. This operation cannot be undone. Are you sure you want to continue?',
        okText: 'Confirm Delete',
        cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        setLoading(true);
        try {
          await storageAdapter.clearAll();
          await updateStats();
          message.success('Data cleanup completed');
        } catch (error) {
          message.error('Data cleanup failed');
          console.error('Clear error:', error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge status="success" text="Connected" />;
      case 'disconnected':
        return <Badge status="error" text="Disconnected" />;
      case 'error':
        return <Badge status="warning" text="Connection Error" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  const storageColumns = [
    {
      title: '文件类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Space>
          {type === 'entries' ? <FileOutlined /> : 
           type === 'images' ? <PictureOutlined /> : 
           <SettingOutlined />}
          <Text strong>{type === 'entries' ? 'Data Files' :
              type === 'images' ? 'Image Files' :
              'Config Files'}</Text>
        </Space>
      )
    },
    {
      title: '文件路径',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => <Text code>{path}</Text>
    },
    {
      title: '文件数量',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Text>{count || 0}</Text>
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => <Text>{formatBytes(size || 0)}</Text>
    }
  ];

  const fileSystemData = fileSystemInfo ? [
    {
      key: 'entries',
      type: 'entries',
      path: `${fileSystemInfo.dataDirectory}/entries.json`,
      count: stats?.entryCount || 0,
      size: stats?.totalSize || 0
    },
    {
      key: 'images',
      type: 'images',
      path: `${fileSystemInfo.dataDirectory}/images/`,
      count: stats?.imageCount || 0,
      size: stats?.imageSize || 0
    },
    ...fileSystemInfo.configFiles.map((file, index) => ({
      key: `config-${index}`,
      type: 'config',
      path: `${fileSystemInfo.dataDirectory}/${file}`,
      count: 1,
      size: 0
    }))
  ] : [];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FolderOutlined /> Storage Management
      </Title>
      <Paragraph>
        Manage local file system storage, view data statistics, and perform data maintenance operations.
      </Paragraph>

      {/* 存储状态概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Storage Mode"
            value={stats?.mode === 'trueLocalFile' ? 'Local File System' : stats?.mode || 'Unknown'}
              prefix={<FolderOutlined />}
              valueStyle={{ color: stats?.mode === 'trueLocalFile' ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Data Entries"
              value={stats?.entryCount || 0}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Image Files"
              value={stats?.imageCount || 0}
              prefix={<PictureOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Storage Size"
              value={formatBytes(stats?.totalSize || 0)}
              prefix={<FolderOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 后端连接状态 */}
      <Card title="Backend Service Status" style={{ marginBottom: 24 }}>
          <Descriptions column={2}>
            <Descriptions.Item label="Connection Status">
              {fileSystemInfo ? getStatusBadge(fileSystemInfo.backendStatus) : <Badge status="default" text="Checking..." />}
            </Descriptions.Item>
            <Descriptions.Item label="Data Directory">
              <Text code>{fileSystemInfo?.dataDirectory || 'Unknown'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Backend Address">
              <Text code>http://localhost:3001</Text>
            </Descriptions.Item>
            <Descriptions.Item label="API Endpoint">
              <Text code>/api/storage</Text>
            </Descriptions.Item>
          </Descriptions>
          
          {fileSystemInfo?.backendStatus !== 'connected' && (
            <Alert
              style={{ marginTop: 16 }}
              message="Backend Service Connection Error"
              description="Please ensure the backend service is running. Run 'npm run server' to start the backend service."
              type="warning"
              showIcon
            />
          )}
        </Card>

      {/* 文件系统详情 */}
      <Card 
        title="File System Details" 
        extra={
          <Button 
            icon={<SyncOutlined />} 
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={storageColumns}
          dataSource={fileSystemData}
          pagination={false}
          size="small"
        />
      </Card>

      {/* 操作面板 */}
      <Card title="Data Operations">
        <Space wrap>
          <Button 
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExportData}
            loading={loading}
            disabled={!stats?.entryCount}
          >
            Export Data
          </Button>
          <Button 
            icon={<SyncOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh Statistics
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />}
            onClick={handleClearData}
            loading={loading}
            disabled={!stats?.entryCount}
          >
            Clear All Data
          </Button>
        </Space>
        
        <Alert
          message="Operation Instructions"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Export Data: Export all data entries as JSON file</li>
              <li>Refresh Statistics: Retrieve the latest storage statistics</li>
              <li>Clear Data: Delete all data entries and image files (irreversible)</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
};

export default StorageManagementPage;