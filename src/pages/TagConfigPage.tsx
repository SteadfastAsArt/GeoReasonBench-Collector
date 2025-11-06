import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Table,
  Modal,
  message,
  Popconfirm,
  Tag,
  Divider,
  Switch,
  Tooltip,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  CopyOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { TagConfig } from '../types';
import { generateId } from '../utils';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TagConfigPageProps {
  tagConfigs: TagConfig[];
  onUpdateTagConfigs: (configs: TagConfig[]) => void;
}

const TagConfigPage: React.FC<TagConfigPageProps> = ({
  tagConfigs,
  onUpdateTagConfigs
}) => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TagConfig | null>(null);
  const [previewConfig, setPreviewConfig] = useState<TagConfig | null>(null);

  // Save configuration
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // Process options for select/multiSelect types
      let processedOptions: string[] | undefined = undefined;
      if (values.type === 'select' || values.type === 'multiSelect') {
        // Filter out empty options
        const filteredOptions = (values.options || []).filter((opt: string) => opt && opt.trim());
        if (filteredOptions.length === 0) {
          message.error('Please add at least one option for select/multiSelect fields');
          return;
        }
        processedOptions = filteredOptions;
      }

      const config: TagConfig = {
        id: editingConfig?.id || generateId(),
        name: values.name,
        label: values.label,
        type: values.type,
        required: values.required || false,
        description: values.description,
        placeholder: values.placeholder,
        options: processedOptions
      };

      let newConfigs;
      if (editingConfig) {
        // Update existing
        newConfigs = tagConfigs.map(c => c.id === editingConfig.id ? config : c);
      } else {
        // Add new
        newConfigs = [...tagConfigs, config];
      }

      onUpdateTagConfigs(newConfigs);
      setModalVisible(false);
      message.success('Tag configuration saved successfully');
    } catch (error) {
      message.error('Please fill in all required fields');
    }
  };

  // Delete tag configuration
  const handleDelete = (id: string) => {
    const updatedConfigs = tagConfigs.filter(config => config.id !== id);
    onUpdateTagConfigs(updatedConfigs);
    message.success('Tag configuration deleted successfully');
  };

  // Edit tag configuration
  const handleEdit = (config: TagConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      name: config.name,
      label: config.label,
      type: config.type,
      required: config.required,
      description: config.description,
      placeholder: config.placeholder,
      options: config.options || []
    });
    
    setModalVisible(true);
  };

  // Add new tag configuration
  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingConfig(null);
  };

  // Duplicate configuration
  const handleDuplicate = (config: TagConfig) => {
    const duplicatedConfig = {
      ...config,
      id: generateId(),
      name: `${config.name}_copy`,
      label: `${config.label} (Copy)`
    };
    
    onUpdateTagConfigs([...tagConfigs, duplicatedConfig]);
    message.success('Tag configuration duplicated successfully');
  };

  // Preview configuration
  const handlePreview = (config: TagConfig) => {
    setPreviewConfig(config);
    setPreviewVisible(true);
  };

  // Render preview component
  const renderPreviewComponent = (config: TagConfig) => {
    const commonProps = {
      placeholder: config.placeholder || `Enter ${config.label}`,
      style: { width: '100%' }
    };

    switch (config.type) {
      case 'select':
        return (
          <Select
            {...commonProps}
            options={config.options?.map(opt => ({ label: opt, value: opt }))}
          />
        );
      case 'multiSelect':
        return (
          <Select
            {...commonProps}
            mode="multiple"
            options={config.options?.map(opt => ({ label: opt, value: opt }))}
          />
        );
      case 'textarea':
        return (
          <TextArea
            {...commonProps}
            rows={3}
          />
        );
      case 'input':
      default:
        return <Input {...commonProps} />;
    }
  };

  const columns = [
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: TagConfig) => (
        <Space>
          <Text strong>{text}</Text>
          {record.required && <Tag color="red">Required</Tag>}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: 'Options',
      dataIndex: 'options',
      key: 'options',
      render: (options: string[]) => {
        if (!options || options.length === 0) return '-';
        return (
          <Space wrap>
            {options.slice(0, 3).map((option, index) => (
              <Tag key={index}>{option}</Tag>
            ))}
            {options.length > 3 && <Tag>+{options.length - 3} more</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-'
    },
    {
       title: 'Actions',
       key: 'actions',
       render: (_: any, record: TagConfig) => (
        <Space>
          <Tooltip title="Preview">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicate(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this tag configuration?"
            onConfirm={() => handleDelete(record.id)}
            okText="Confirm"
            cancelText="Cancel"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <Title level={3} style={{ margin: 0 }}>Tag Configuration Management</Title>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Add Tag
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Text type="secondary">
          Configure custom tags for data entry. Support for text input, textarea, single select, and multi-select types.
        </Text>
      </Card>

      {/* Tags Table */}
      <Card>
        <Table
          dataSource={tagConfigs}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Configuration Modal */}
      <Modal
        title={editingConfig ? 'Edit Tag Configuration' : 'Add Tag Configuration'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={handleModalClose}
        width={600}
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="label"
            label="Display Label"
            rules={[{ required: true, message: 'Please enter display label' }]}
          >
            <Input placeholder="Enter display label" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Field Name"
            rules={[{ required: true, message: 'Please enter field name' }]}
          >
            <Input placeholder="Enter field name (used internally)" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Field Type"
            rules={[{ required: true, message: 'Please select field type' }]}
          >
            <Select placeholder="Select field type">
              <Select.Option value="input">Text Input</Select.Option>
              <Select.Option value="textarea">Text Area</Select.Option>
              <Select.Option value="select">Single Select</Select.Option>
              <Select.Option value="multiSelect">Multi Select</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="required" valuePropName="checked">
            <Switch checkedChildren="Required" unCheckedChildren="Optional" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input placeholder="Enter field description" />
          </Form.Item>

          <Form.Item name="placeholder" label="Placeholder">
            <Input placeholder="Enter placeholder text" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'select' || type === 'multiSelect') {
                return (
                  <>
                    <Divider>Options Configuration</Divider>
                    <Form.List name="options">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                              <Form.Item
                                {...restField}
                                name={name}
                                rules={[{ required: true, message: 'Option required' }]}
                              >
                                <Input placeholder="Option value" />
                              </Form.Item>
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            </Space>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            block
                            icon={<PlusOutlined />}
                          >
                            Add Option
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={`Preview: ${previewConfig?.label}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>
        ]}
      >
        {previewConfig && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Field Type: </Text>
              <Tag color="blue">{previewConfig.type}</Tag>
              {previewConfig.required && <Tag color="red">Required</Tag>}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Description: </Text>
              <Text type="secondary">{previewConfig.description || 'No description'}</Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Preview:</Text>
            </div>
            
            <div style={{ padding: 16, border: '1px dashed #d9d9d9', borderRadius: 6 }}>
              <Form.Item label={previewConfig.label} required={previewConfig.required}>
                {renderPreviewComponent(previewConfig)}
              </Form.Item>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TagConfigPage;