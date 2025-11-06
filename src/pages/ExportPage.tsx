import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Progress,
  Alert,
  Form,
  Switch,
  Input,
  message,
  Tag,
  Radio
} from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  SettingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { DataEntry, ExportConfig } from '../types';
import { exportToJSON, exportToOpenAI, downloadFile, validateDataEntry, exportDataWithImages } from '../utils';
import { storageAdapter } from '../utils/storage-adapter';

interface ExportPageProps {
  entries: DataEntry[];
  exportConfig: ExportConfig;
  onExport: (config: ExportConfig) => void;
}

const ExportPage: React.FC<ExportPageProps> = ({
  entries,
  exportConfig,
  onExport
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    valid: DataEntry[];
    invalid: { entry: DataEntry; errors: string[] }[];
  } | null>(null);

  // Data validation
  const handleValidation = () => {
    const valid: DataEntry[] = [];
    const invalid: { entry: DataEntry; errors: string[] }[] = [];

    entries.forEach(entry => {
      const errors = validateDataEntry(entry);
      if (errors.length === 0) {
        valid.push(entry);
      } else {
        invalid.push({ entry, errors });
      }
    });

    setValidationResults({ valid, invalid });
    
    if (invalid.length === 0) {
      message.success(`All ${valid.length} data entries passed validation`);
    } else {
      message.warning(`${valid.length} data entries passed validation, ${invalid.length} entries have issues`);
    }
  };

  // 导出数据
  const handleExport = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      
      const config: ExportConfig = {
        format: values.format,
        imagePath: values.imagePath,
        includeHistory: values.includeHistory,
        customRules: values.customRules ? JSON.parse(values.customRules) : undefined,
        exportImages: values.exportImages,
        exportFormat: values.exportFormat || 'zip'
      };

      // Get full data for export (including original images)
      let dataToExport: DataEntry[];
      if (config.exportImages) {
        // For image export, get full data with original images
        const fullEntries = await storageAdapter.getAllEntriesForExport();
        dataToExport = validationResults ? 
          validationResults.valid.map(validEntry => 
            fullEntries.find(fullEntry => fullEntry.id === validEntry.id) || validEntry
          ) : fullEntries;
      } else {
        // For JSON-only export, use existing data
        dataToExport = validationResults ? validationResults.valid : entries;
      }
      
      if (dataToExport.length === 0) {
        message.error('No data available for export');
        return;
      }

      // Use new export function that handles images
      if (config.exportImages) {
        await exportDataWithImages(dataToExport, config);
        const imageCount = dataToExport.filter(entry => entry.image).length;
        message.success(`Successfully exported ${dataToExport.length} data entries with ${imageCount} images`);
      } else {
        // Original export logic for JSON only
        let exportContent: string;
        let filename: string;
        
        if (config.format === 'json') {
          exportContent = exportToJSON(dataToExport, config);
          filename = `georeasonbench_data_${new Date().toISOString().split('T')[0]}.json`;
        } else {
          exportContent = exportToOpenAI(dataToExport, config);
          filename = `georeasonbench_openai_${new Date().toISOString().split('T')[0]}.json`;
        }

        downloadFile(exportContent, filename);
        message.success(`Successfully exported ${dataToExport.length} data entries`);
      }
      
      onExport(config);
    } catch (error) {
      message.error('Export failed, please check configuration');
    } finally {
      setLoading(false);
    }
  };

  // 预览导出内容
  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      const config: ExportConfig = {
        format: values.format,
        imagePath: values.imagePath,
        includeHistory: values.includeHistory,
        customRules: values.customRules ? JSON.parse(values.customRules) : undefined
      };

      const sampleData = entries.slice(0, 2); // Preview only first 2 entries
      let previewContent: string;
      
      if (config.format === 'json') {
        previewContent = exportToJSON(sampleData, config);
      } else {
        previewContent = exportToOpenAI(sampleData, config);
      }

      // 显示预览模态框
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <title>Export Preview</title>
              <style>
                body { font-family: monospace; padding: 20px; }
                pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; }
              </style>
            </head>
            <body>
              <h2>Export Preview (First 2 Entries)</h2>
              <pre>${previewContent}</pre>
            </body>
          </html>
        `);
      }
    } catch (error) {
      message.error('Preview failed, please check configuration');
    }
  };

  // 验证结果表格列
  const validationColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => text.substring(0, 8) + '...'
    },
    {
      title: 'Query Content',
      dataIndex: 'query',
      key: 'query',
      ellipsis: true,
      render: (text: string) => text.substring(0, 50) + (text.length > 50 ? '...' : '')
    },
    {
      title: 'Error Messages',
      key: 'errors',
      render: (record: { entry: DataEntry; errors: string[] }) => (
        <Space direction="vertical">
          {record.errors.map((error, index) => (
            <Tag key={index} color="red">{error}</Tag>
          ))}
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Data Overview */}
      <Card title="Data Overview" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p>Total Entries: <strong>{entries.length}</strong></p>
            <p>With Images: <strong>{entries.filter(e => e.image).length}</strong></p>
            <p>Complete Data: <strong>{entries.filter(e => e.query && e.gt_answer).length}</strong></p>
          </div>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleValidation}
          >
            Validate Data
          </Button>
        </div>
      </Card>

      {/* Validation Results */}
      {validationResults && (
        <Card title="Validation Results" style={{ marginBottom: 16 }}>
          <Alert
            message={`Validation completed: ${validationResults.valid.length} passed, ${validationResults.invalid.length} failed`}
            type={validationResults.invalid.length === 0 ? 'success' : 'warning'}
            style={{ marginBottom: 16 }}
          />
          
          {validationResults.invalid.length > 0 && (
            <Table
              columns={validationColumns}
              dataSource={validationResults.invalid}
              rowKey={(record) => record.entry.id}
              pagination={{ pageSize: 5 }}
              size="small"
            />
          )}
        </Card>
      )}

      {/* Export Configuration */}
      <Card title="Export Configuration" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={exportConfig}
        >
          <Form.Item
            name="format"
            label="Export Format"
            rules={[{ required: true, message: 'Please select export format' }]}
          >
            <Radio.Group>
              <Radio.Button value="json">
                <FileTextOutlined /> Standard JSON Format
              </Radio.Button>
              <Radio.Button value="openai">
                <SettingOutlined /> OpenAI Conversation Format
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="imagePath"
            label="Image Storage Path"
            rules={[{ required: true, message: 'Please enter image storage path' }]}
            help="Relative path for images during export, e.g.: ./images or /assets/images"
          >
            <Input placeholder="./images" />
          </Form.Item>

          <Form.Item
            name="includeHistory"
            label="Include Version History"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="exportImages"
            label="Export Actual Image Files"
            valuePropName="checked"
            help="Export actual image files instead of just JSON references"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="exportFormat"
            label="Image Export Format"
            help="Choose how to export image files"
            dependencies={['exportImages']}
          >
            <Radio.Group disabled={!form.getFieldValue('exportImages')}>
              <Radio value="zip">All in one ZIP file (JSON + Images)</Radio>
              <Radio value="separate">Separate files (JSON + Images ZIP)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="customRules"
            label="Custom Conversion Rules (JSON Format)"
            help="Advanced users can define custom data conversion rules"
          >
            <Input.TextArea
              rows={4}
              placeholder='{"systemPrompt": "You are a helpful assistant", "userRole": "user"}'
            />
          </Form.Item>
        </Form>
      </Card>

      {/* Format Description */}
      <Card title="Format Description" style={{ marginBottom: 16 }}>
        <div>
          <h4>Standard JSON Format:</h4>
          <p>Maintains original data structure, suitable for data backup and migration. Image paths will be converted to relative paths.</p>
          
          <h4>OpenAI Conversation Format:</h4>
          <p>Converts to OpenAI API compatible conversations format, suitable for training and inference. Includes the following conversion rules:</p>
          <ul>
            <li>solution field converts to system message</li>
            <li>query and image convert to user message</li>
            <li>gt_answer converts to assistant message</li>
            <li>Image paths convert to Markdown format</li>
          </ul>
        </div>
      </Card>

      {/* Action Buttons */}
      <Card>
        <Space>
          <Button
            type="default"
            icon={<FileTextOutlined />}
            onClick={handlePreview}
          >
            Preview Export
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={loading}
            onClick={handleExport}
            disabled={!validationResults || validationResults.valid.length === 0}
          >
            Export Data
          </Button>
        </Space>
        
        {validationResults && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={Math.round((validationResults.valid.length / entries.length) * 100)}
              status={validationResults.invalid.length === 0 ? 'success' : 'active'}
              format={() => `${validationResults.valid.length}/${entries.length}`}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ExportPage;