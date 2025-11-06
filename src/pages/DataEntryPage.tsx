import React, { useState, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Select,
  Divider,
  InputNumber,
  DatePicker,
  Switch,
  Rate,
  Slider
} from 'antd';
import {
  UploadOutlined,
  PictureOutlined,
  SaveOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { DataEntry, TagConfig } from '../types';
import { generateId, pasteImageFromClipboard, validateDataEntry, compressImage } from '../utils';
import MarkdownEditor from '../components/MarkdownEditor';

interface DataEntryPageProps {
  tagConfigs: TagConfig[];
  onSave: (entry: DataEntry) => Promise<void>;
}

const DataEntryPage: React.FC<DataEntryPageProps> = ({ tagConfigs, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [queryContent, setQueryContent] = useState('');
  const [solutionContent, setSolutionContent] = useState('');
  const [gtAnswerContent, setGtAnswerContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      setLoading(true);
      const compressedImage = await compressImage(file);
      setImagePreview(compressedImage);
      form.setFieldsValue({ image: compressedImage });
      message.success('Image uploaded successfully');
    } catch (error) {
      message.error('Image upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Paste image from clipboard
  const handlePasteImage = async () => {
    try {
      setLoading(true);
      const imageData = await pasteImageFromClipboard();
      if (imageData) {
        setImagePreview(imageData);
        form.setFieldsValue({ image: imageData });
        message.success('Image pasted successfully');
      } else {
        message.warning('No image found in clipboard');
      }
    } catch (error) {
      message.error('Failed to paste image');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleImageUpload(imageFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Save data
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const entry: DataEntry = {
        id: generateId(),
        image: imagePreview || undefined,
        query: queryContent,
        solution: solutionContent || undefined,
        gt_answer: gtAnswerContent,
        tags: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      // 添加自定义标签值
      tagConfigs.forEach(config => {
        if (values[config.id] !== undefined) {
          entry.tags[config.id] = values[config.id];
        }
      });

      // 验证数据
      const errors = validateDataEntry(entry);
      if (errors.length > 0) {
        message.error(errors.join(', '));
        return;
      }

      await onSave(entry);
      handleClear();
    } catch (error) {
      message.error('Save failed, please check required fields');
    } finally {
      setLoading(false);
    }
  };

  // 清空表单
  const handleClear = () => {
    form.resetFields();
    setImagePreview('');
    setQueryContent('');
    setSolutionContent('');
    setGtAnswerContent('');
  };

  // Render tag input component
  const renderTagInput = (config: TagConfig) => {
    const rules = [
      { required: config.required, message: `Please ${config.type === 'select' || config.type === 'multiSelect' ? 'select' : 'enter'} ${config.label || config.name}` }
    ];

    const placeholder = config.placeholder || `Please ${config.type === 'select' || config.type === 'multiSelect' ? 'select' : 'enter'} ${config.label || config.name}`;

    switch (config.type) {
      case 'select':
        return (
          <Form.Item
            key={config.id}
            name={config.id}
            label={config.label || config.name}
            rules={rules}
            tooltip={config.description}
            style={{ width: '100%' }}
          >
            <Select
              placeholder={placeholder}
              options={config.options?.map(option => ({
                label: option,
                value: option
              }))}
            />
          </Form.Item>
        );

      case 'multiSelect':
        return (
          <Form.Item
            key={config.id}
            name={config.id}
            label={config.label || config.name}
            rules={rules}
            tooltip={config.description}
            style={{ width: '100%' }}
          >
            <Select
              mode="multiple"
              placeholder={placeholder}
              options={config.options?.map(option => ({
                label: option,
                value: option
              }))}
            />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item
            key={config.id}
            name={config.id}
            label={config.label || config.name}
            rules={rules}
            tooltip={config.description}
            style={{ width: '100%' }}
          >
            <Input.TextArea
               rows={3}
               placeholder={placeholder}
             />
          </Form.Item>
        );

      case 'input':
      default:
        return (
          <Form.Item
            key={config.id}
            name={config.id}
            label={config.label || config.name}
            rules={rules}
            tooltip={config.description}
            style={{ width: '100%' }}
          >
            <Input placeholder={placeholder} />
          </Form.Item>
        );
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 600, 
          margin: 0, 
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <SaveOutlined style={{ color: 'var(--primary-color)' }} />
          Data Entry
        </h1>
        <p style={{ 
          margin: '8px 0 0 0', 
          color: 'var(--text-secondary)',
          fontSize: '16px'
        }}>
          Create new data entries with image upload and Markdown support
        </p>
      </div>

      <Card 
        className="data-entry-card"
        style={{
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-container)'
        }}
        extra={
          <Space size="middle">
            <Button 
              icon={<ClearOutlined />} 
              onClick={handleClear}
              size="large"
              style={{
                borderRadius: 'var(--border-radius)',
                height: '40px',
                fontWeight: 500
              }}
            >
              Clear
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSave}
              size="large"
              style={{
                borderRadius: 'var(--border-radius)',
                height: '40px',
                fontWeight: 500,
                background: 'var(--primary-color)',
                borderColor: 'var(--primary-color)'
              }}
            >
              Save
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" size="large">
          {/* 图片上传区域 */}
          <Form.Item label={
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Image (Optional)
            </span>
          }>
            <div
              className="image-upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{ 
                marginBottom: 24,
                borderRadius: 'var(--border-radius-lg)',
                border: '2px dashed var(--border-color)',
                background: 'var(--bg-layout)',
                transition: 'all 0.3s ease'
              }}
            >
              {imagePreview ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }}
                  />
                  <Button
                    type="text"
                    danger
                    style={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={() => {
                      setImagePreview('');
                      form.setFieldsValue({ image: undefined });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <div style={{ padding: 40 }}>
                  <PictureOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <div style={{ marginBottom: 16 }}>
                    <p>Click to upload or drag image to this area</p>
                    <p style={{ color: '#999' }}>Supports JPG, PNG and other formats</p>
                  </div>
                  <Space>
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
                    <Button
                      icon={<PictureOutlined />}
                      onClick={handlePasteImage}
                    >
                      Paste from Clipboard
                    </Button>
                  </Space>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
          </Form.Item>

          {/* 查询内容 */}
          <Form.Item
            name="queryContent"
            label={
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Query Content (Required)
              </span>
            }
            required
            rules={[{ required: true, message: 'Please enter query content' }]}
            style={{ marginBottom: '32px' }}
          >
            <MarkdownEditor
              value={queryContent}
              onChange={setQueryContent}
              placeholder="Enter query content, Markdown format supported..."
              height={200}
              resizable={true}
            />
          </Form.Item>

          {/* Solution */}
          <Form.Item 
            name="solutionContent" 
            label={
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Solution (Optional)
              </span>
            }
            style={{ marginBottom: '32px' }}
          >
            <MarkdownEditor
              value={solutionContent}
              onChange={setSolutionContent}
              placeholder="Enter solution, Markdown format supported..."
              height={150}
              resizable={true}
            />
          </Form.Item>

          {/* Ground Truth Answer */}
          <Form.Item 
            label={
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Standard Answer (Required)
              </span>
            }
            required
            validateStatus={gtAnswerContent.trim() === '' ? 'error' : ''}
            help={gtAnswerContent.trim() === '' ? 'Please enter standard answer' : ''}
            style={{ marginBottom: '32px' }}
          >
            <MarkdownEditor
              value={gtAnswerContent}
              onChange={setGtAnswerContent}
              placeholder="Enter standard answer, Markdown format supported..."
              height={150}
              resizable={true}
            />
          </Form.Item>

          {/* Custom Tags */}
          {tagConfigs.length > 0 && (
            <>
              <Divider style={{ 
                margin: '40px 0 32px 0',
                borderColor: 'var(--border-color)',
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                Custom Tags
              </Divider>
              <div style={{ display: 'grid', gap: '24px' }}>
                {tagConfigs.map(renderTagInput)}
              </div>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default DataEntryPage;