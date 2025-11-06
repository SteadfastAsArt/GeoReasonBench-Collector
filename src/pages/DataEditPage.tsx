import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  DatePicker,
  Image,
  Popconfirm,
  Tooltip,
  message,
  InputNumber,
  Switch,
  Rate,
  Slider
} from 'antd';
import dayjs from 'dayjs';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  HistoryOutlined,
  EyeOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { DataEntry, TagConfig, FilterCondition } from '../types';
import { formatDate, truncateText } from '../utils';
import { debounce } from '../utils/performance';
import MarkdownEditor from '../components/MarkdownEditor';
import VirtualTable from '../components/VirtualTable';
import LazyImage from '../components/LazyImage';
import { usePagination } from '../hooks/usePagination';

const { RangePicker } = DatePicker;

interface DataEditPageProps {
  entries: DataEntry[];
  tagConfigs: TagConfig[];
  currentEntry: DataEntry | null;
  filterCondition: FilterCondition;
  onEdit: (entry: DataEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onFilter: (condition: FilterCondition) => void;
  onSave: (entry: DataEntry) => Promise<void>;
}

const DataEditPage: React.FC<DataEditPageProps> = ({
  entries,
  tagConfigs,
  currentEntry,
  filterCondition,
  onEdit,
  onDelete,
  onFilter,
  onSave
}) => {
  const [form] = Form.useForm();
  const [filteredEntries, setFilteredEntries] = useState<DataEntry[]>(entries);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DataEntry | null>(null);
  const [queryContent, setQueryContent] = useState('');
  const [solutionContent, setSolutionContent] = useState('');
  const [gtAnswerContent, setGtAnswerContent] = useState('');
  const [searchKeyword, setSearchKeyword] = useState(filterCondition.keyword);

  // 分页功能
  const pagination = usePagination({
    data: filteredEntries,
    pageSize: 50, // 每页显示50条数据
    initialPage: 1
  });

  // 防抖搜索函数
  const debouncedSearch = useMemo(
    () => debounce((keyword: string) => {
      onFilter({
        ...filterCondition,
        keyword
      });
    }, 300),
    [filterCondition, onFilter]
  );

  // 处理搜索输入变化
  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    debouncedSearch(value);
  };

  // Filter data
  useEffect(() => {
    let filtered = entries;

    // Keyword filtering
    if (filterCondition.keyword) {
      const keyword = filterCondition.keyword.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.query.toLowerCase().includes(keyword) ||
        entry.gt_answer.toLowerCase().includes(keyword) ||
        (entry.solution && entry.solution.toLowerCase().includes(keyword))
      );
    }

    // Tag filtering
    Object.entries(filterCondition.tags).forEach(([tagId, value]) => {
      if (value) {
        filtered = filtered.filter(entry => {
          const entryValue = entry.tags[tagId];
          if (Array.isArray(value)) {
            return value.some(v => Array.isArray(entryValue) ? entryValue.includes(v) : entryValue === v);
          }
          return Array.isArray(entryValue) ? entryValue.includes(value) : entryValue === value;
        });
      }
    });

    // Image filtering
    if (filterCondition.hasImage !== null) {
      filtered = filtered.filter(entry => 
        filterCondition.hasImage ? !!entry.image : !entry.image
      );
    }

    // Date range filtering
    if (filterCondition.dateRange) {
      const [startDate, endDate] = filterCondition.dateRange;
      filtered = filtered.filter(entry => {
        const entryDate = entry.createdAt.split('T')[0];
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    setFilteredEntries(filtered);
  }, [entries, filterCondition]);

  // 打开编辑模态框
  const handleEdit = (entry: DataEntry) => {
    setSelectedEntry(entry);
    setQueryContent(entry.query);
    setSolutionContent(entry.solution || '');
    setGtAnswerContent(entry.gt_answer);
    form.setFieldsValue({
      ...entry.tags
    });
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedEntry) return;

      const updatedEntry: DataEntry = {
        ...selectedEntry,
        query: queryContent,
        solution: solutionContent || undefined,
        gt_answer: gtAnswerContent,
        tags: {},
        updatedAt: new Date().toISOString(),
        version: selectedEntry.version + 1
      };

      // 更新标签
      tagConfigs.forEach(config => {
        if (values[config.id] !== undefined) {
          updatedEntry.tags[config.id] = values[config.id];
        }
      });

      await onSave(updatedEntry);
      setEditModalVisible(false);
      message.success('Data updated successfully');
      } catch (error) {
        message.error('Save failed, please check required fields');
    }
  };

  // 查看历史版本
  const handleViewHistory = (entry: DataEntry) => {
    setSelectedEntry(entry);
    setHistoryModalVisible(true);
  };

  // 预览数据
  const handlePreview = (entry: DataEntry) => {
    setSelectedEntry(entry);
    setPreviewModalVisible(true);
  };

  // 筛选条件变化
  const handleFilterChange = (key: string, value: any) => {
    onFilter({
      ...filterCondition,
      [key]: value
    });
  };

  const handleTagFilterChange = (tagId: string, value: any) => {
    onFilter({
      ...filterCondition,
      tags: {
        ...filterCondition.tags,
        [tagId]: value
      }
    });
  };

  // Table column definitions
  const columns = [
    {
      title: '📷 Image',
      dataIndex: 'image',
      key: 'image',
      width: 90,
      align: 'center' as const,
      render: (image: string) => (
        <div className="image-cell">
          {image ? (
            <LazyImage
              src={image}
              width={50}
              height={50}
              style={{ objectFit: 'cover', borderRadius: 6 }}
              alt="Entry image"
            />
          ) : (
            <div style={{ 
              width: 50, 
              height: 50, 
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', 
              borderRadius: 6, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#999',
              border: '2px dashed var(--border-color)'
            }}>
              <PictureOutlined />
            </div>
          )}
        </div>
      )
    },
    {
      title: '❓ Query Content',
      dataIndex: 'query',
      key: 'query',
      ellipsis: true,
      render: (text: string) => (
        <div className="content-cell">
          <Tooltip title={text} placement="topLeft">
            <div 
              className="content-preview"
              dangerouslySetInnerHTML={{ __html: truncateText(text, 120) }} 
            />
          </Tooltip>
        </div>
      )
    },
    {
      title: '✅ Ground Truth Answer',
      dataIndex: 'gt_answer',
      key: 'gt_answer',
      ellipsis: true,
      render: (text: string) => (
        <div className="content-cell">
          <Tooltip title={text} placement="topLeft">
            <div className="content-preview">
              {truncateText(text, 80)}
            </div>
          </Tooltip>
        </div>
      )
    },
    {
      title: '🏷️ Tags',
      key: 'tags',
      width: 280,
      render: (record: DataEntry) => (
        <div className="tags-cell">
          {Object.entries(record.tags).map(([key, value]) => {
            if (!value) return null;
            const config = tagConfigs.find(c => c.id === key);
            const label = config?.label || key;
            
            let displayValue = value;
             let color = 'blue';
            
            // Format value based on tag type
            if (config) {
              switch (config.type) {
                case 'boolean':
                  displayValue = value ? 'Yes' : 'No';
                  color = value ? 'green' : 'red';
                  break;
                case 'rating':
                  displayValue = `★${value}`;
                  color = 'gold';
                  break;
                case 'date':
                  displayValue = new Date(value).toLocaleDateString();
                  color = 'purple';
                  break;
                case 'number':
                case 'slider':
                  displayValue = Number(value).toString();
                  color = 'cyan';
                  break;
                case 'multiSelect':
                  displayValue = Array.isArray(value) ? value.join(', ') : value;
                  color = 'geekblue';
                  break;
                default:
                  displayValue = Array.isArray(value) ? value.join(', ') : value;
              }
            }
            
            const tagText = `${label}: ${displayValue}`;
            
            return (
              <Tooltip key={key} title={tagText} placement="top">
                <Tag 
                  color={color}
                  style={{ 
                    fontSize: '11px',
                    margin: 0,
                    borderRadius: '12px',
                    fontWeight: 500,
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tagText.length > 20 ? tagText.substring(0, 20) + '...' : tagText}
                </Tag>
              </Tooltip>
            );
          })}
          {Object.values(record.tags).every(v => !v) && (
            <Tag 
              color="default" 
              style={{ 
                fontSize: '11px', 
                margin: 0, 
                borderRadius: '12px',
                color: 'var(--text-secondary)'
              }}
            >
              No tags
            </Tag>
          )}
        </div>
      )
    },
    {
      title: '📅 Created Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      align: 'center' as const,
      render: (date: string) => (
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-secondary)',
          fontWeight: 500
        }}>
          {formatDate(date)}
        </div>
      )
    },
    {
      title: '📊 Version',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center' as const,
      render: (version: number) => (
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-secondary)',
          fontWeight: 500
        }}>
          v{version}
        </div>
      )
    },
    {
      title: '⚡ Actions',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      render: (record: DataEntry) => (
        <div className="actions-cell">
          <Tooltip title="Preview">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
          <Tooltip title="Version History">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(record)}
              disabled={!record.history || record.history.length === 0}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this data?"
            onConfirm={async () => await onDelete(record.id)}
            okText="Confirm"
            cancelText="Cancel"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{ borderRadius: 6 }}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
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
          <EditOutlined style={{ color: 'var(--primary-color)' }} />
          Data Management
        </h1>
        <p style={{ 
          margin: '8px 0 0 0', 
          color: 'var(--text-secondary)',
          fontSize: '16px'
        }}>
          View, edit and manage data entries
        </p>
      </div>

      {/* 筛选区域 */}
      <Card 
        title={
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FilterOutlined style={{ color: 'var(--primary-color)' }} />
            Data Filters
          </span>
        }
        style={{ 
          marginBottom: 24,
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-container)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <Input
            placeholder="Search keywords..."
            prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ 
              width: 300,
              borderRadius: 'var(--border-radius)',
              height: '40px'
            }}
          />
          <Select
            placeholder="Image Filter"
            value={filterCondition.hasImage}
            onChange={(value) => handleFilterChange('hasImage', value)}
            style={{ 
              width: 140,
              height: '40px'
            }}
            allowClear
          >
            <Select.Option value={true}>With Image</Select.Option>
              <Select.Option value={false}>Without Image</Select.Option>
          </Select>

          <RangePicker
            placeholder={['Start Date', 'End Date']}
            value={filterCondition.dateRange ? [dayjs(filterCondition.dateRange[0]), dayjs(filterCondition.dateRange[1])] : null}
            onChange={(dates) => {
              if (dates) {
                handleFilterChange('dateRange', [
                  dates[0]?.format('YYYY-MM-DD'),
                  dates[1]?.format('YYYY-MM-DD')
                ]);
              } else {
                handleFilterChange('dateRange', null);
              }
            }}
          />

          {tagConfigs.map(config => {
            // Only show filter for select/multiSelect types and boolean
            if (!config.options && config.type !== 'boolean') return null;
            
            return (
              <Select
                key={config.id}
                placeholder={`筛选 ${config.label || config.name}`}
                allowClear
                mode={config.type === 'multiSelect' ? 'multiple' : undefined}
                value={filterCondition.tags[config.id]}
                onChange={(value) => handleTagFilterChange(config.id, value)}
                style={{ 
                  minWidth: 150,
                  height: '40px'
                }}
              >
                {config.type === 'boolean' ? (
                  <>
                    <Select.Option value={true}>Yes</Select.Option>
                  <Select.Option value={false}>No</Select.Option>
                  </>
                ) : (
                  config.options?.map(option => (
                    <Select.Option key={option} value={option}>
                      {option}
                    </Select.Option>
                  ))
                )}
              </Select>
            );
          })}
        </div>
      </Card>

      {/* Data Table */}
      <Card 
        title={
          <span style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Data List 
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 500, 
              color: 'var(--text-secondary)',
              background: 'var(--primary-1)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--primary-3)'
            }}>
              {filteredEntries.length} entries
            </span>
          </span>
        }
        style={{
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-container)'
        }}
        className="data-list-table"
      >

        {/* 根据数据量选择渲染方式 */}
        {filteredEntries.length > 100 ? (
          <VirtualTable
            columns={columns}
            dataSource={pagination.currentData}
            rowKey="id"
            height={600}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={pagination.currentData}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 1200 }}
          />
        )}
        
        {/* 自定义分页控件 */}
        {filteredEntries.length > 0 && (
          <div className="data-list-pagination">
            <div style={{ 
              fontSize: '14px',
              color: 'var(--text-secondary)',
              fontWeight: 500
            }}>
              📄 Showing {pagination.getPageInfo().start} - {pagination.getPageInfo().end} of {pagination.totalItems} entries
            </div>
            <Space size="middle">
              <Select
                value={pagination.pageSize}
                onChange={pagination.setPageSize}
                style={{ width: 140 }}
                size="middle"
              >
                <Select.Option value={20}>📄 20 per page</Select.Option>
                <Select.Option value={50}>📄 50 per page</Select.Option>
                <Select.Option value={100}>📄 100 per page</Select.Option>
              </Select>
              <Button 
                disabled={!pagination.hasPrevPage}
                onClick={pagination.prevPage}
                size="middle"
              >
                ⬅️ Previous
              </Button>
              <span style={{ 
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                padding: '0 8px'
              }}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button 
                disabled={!pagination.hasNextPage}
                onClick={pagination.nextPage}
                size="middle"
              >
                Next ➡️
              </Button>
            </Space>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Data"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
        width={800}
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Query Content">
            <MarkdownEditor
              value={queryContent}
              onChange={setQueryContent}
              placeholder="Please enter query content, supports Markdown format..."
              height={150}
              resizable={true}
            />
          </Form.Item>

          <Form.Item label="Solution">
            <MarkdownEditor
              value={solutionContent}
              onChange={setSolutionContent}
              placeholder="Please enter solution, supports Markdown format..."
              height={100}
              resizable={true}
            />
          </Form.Item>

          <Form.Item 
            label="Ground Truth Answer"
            required
            validateStatus={gtAnswerContent.trim() === '' ? 'error' : ''}
            help={gtAnswerContent.trim() === '' ? 'Please enter ground truth answer' : ''}
          >
            <MarkdownEditor
              value={gtAnswerContent}
              onChange={setGtAnswerContent}
              placeholder="Please enter ground truth answer, supports Markdown format..."
              height={120}
              resizable={true}
            />
          </Form.Item>

          {tagConfigs.map(config => {
            const rules = [
              { required: config.required, message: `Please ${config.type === 'select' || config.type === 'multiSelect' ? 'select' : 'enter'} ${config.label || config.name}` }
            ];

            switch (config.type) {
              case 'select':
                return (
                  <Form.Item
                    key={config.id}
                    name={config.id}
                    label={config.label || config.name}
                    rules={rules}
                  >
                    <Select placeholder={`Please select ${config.label || config.name}`}>
                      {config.options?.map(option => (
                        <Select.Option key={option} value={option}>
                          {option}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );

              case 'multiSelect':
                return (
                  <Form.Item
                    key={config.id}
                    name={config.id}
                    label={config.label || config.name}
                    rules={rules}
                  >
                    <Select mode="multiple" placeholder={`Please select ${config.label || config.name}`}>
                      {config.options?.map(option => (
                        <Select.Option key={option} value={option}>
                          {option}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );

              case 'textarea':
                return (
                  <Form.Item
                    key={config.id}
                    name={config.id}
                    label={config.label || config.name}
                    rules={rules}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder={`Please enter ${config.label || config.name}`}
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
                  >
                    <Input placeholder={`Please enter ${config.label || config.name}`} />
                  </Form.Item>
                );
            }
          })}
        </Form>
      </Modal>

      {/* History Modal */}
      <Modal
        title="Version History"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedEntry?.history && selectedEntry.history.length > 0 ? (
          <div>
            {selectedEntry.history.map((historyItem, index) => (
              <Card key={index} size="small" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Version v{historyItem.version}</span>
                  <span>{formatDate(historyItem.timestamp)}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                  Action Type: {historyItem.action === 'create' ? 'Created' : historyItem.action === 'update' ? 'Updated' : 'Deleted'}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#999' }}>
            No version history available
          </div>
        )}
      </Modal>

      {/* Preview Modal */}
      <Modal
        title="Data Preview"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedEntry && (
          <div>
            {selectedEntry.image && (
            <div style={{ marginBottom: 16 }}>
              <h4>Image:</h4>
              <LazyImage 
                src={selectedEntry.image} 
                style={{ maxWidth: '100%', maxHeight: '400px' }}
                alt="Entry image preview"
              />
            </div>
          )}
            
            <div style={{ marginBottom: 16 }}>
              <h4>Query Content:</h4>
              <div dangerouslySetInnerHTML={{ __html: selectedEntry.query }} />
            </div>

            {selectedEntry.solution && (
              <div style={{ marginBottom: 16 }}>
                <h4>Solution:</h4>
                <div dangerouslySetInnerHTML={{ __html: selectedEntry.solution }} />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <h4>Ground Truth Answer:</h4>
              <div>{selectedEntry.gt_answer}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4>Tags:</h4>
              <Space wrap>
                {Object.entries(selectedEntry.tags).map(([key, value]) => {
                  const config = tagConfigs.find(c => c.id === key);
                  if (!value || !config) return null;
                  return (
                    <Tag key={key} color="blue">
                      {config.name}: {Array.isArray(value) ? value.join(', ') : value}
                    </Tag>
                  );
                })}
              </Space>
            </div>

            <div>
              <h4>Metadata:</h4>
              <p>Created Time: {formatDate(selectedEntry.createdAt)}</p>
              <p>Updated Time: {formatDate(selectedEntry.updatedAt)}</p>
              <p>Version: v{selectedEntry.version}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DataEditPage;