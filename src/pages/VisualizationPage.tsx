import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Tabs, Table } from 'antd';
import { DatabaseOutlined, CheckCircleOutlined, PictureOutlined, TagsOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { DataEntry, StatisticsData } from '../types';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface VisualizationPageProps {
  statistics: StatisticsData;
  entries: DataEntry[];
}

const VisualizationPage: React.FC<VisualizationPageProps> = ({
  statistics,
  entries
}) => {
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [filteredStats, setFilteredStats] = useState<StatisticsData>(statistics);

  // Filter statistics data based on date range
  useEffect(() => {
    if (!dateRange) {
      setFilteredStats(statistics);
      return;
    }

    const [startDate, endDate] = dateRange;
    const filteredEntries = entries.filter(entry => {
      const entryDate = entry.createdAt.split('T')[0];
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Recalculate statistics data
    const totalEntries = filteredEntries.length;
    const completedEntries = filteredEntries.filter(entry => 
      entry.query && entry.gt_answer
    ).length;

    const tagDistribution: Record<string, number> = {};
    const fieldCompleteness = {
      image: 0,
      query: 0,
      solution: 0,
      gt_answer: 0
    };

    filteredEntries.forEach(entry => {
      if (entry.image) fieldCompleteness.image++;
      if (entry.query) fieldCompleteness.query++;
      if (entry.solution) fieldCompleteness.solution++;
      if (entry.gt_answer) fieldCompleteness.gt_answer++;

      Object.entries(entry.tags).forEach(([key, value]) => {
        if (value) {
          tagDistribution[key] = (tagDistribution[key] || 0) + 1;
        }
      });
    });

    const timeSeriesData = filteredEntries.reduce((acc, entry) => {
      const date = entry.createdAt.split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as { date: string; count: number }[]);

    setFilteredStats({
      totalEntries,
      completedEntries,
      tagDistribution,
      fieldCompleteness,
      timeSeriesData: timeSeriesData.sort((a, b) => a.date.localeCompare(b.date))
    });
  }, [dateRange, entries, statistics]);

  // Tag distribution pie chart configuration
  const tagDistributionOption = {
    title: {
      text: 'Tag Distribution',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: 'Tag Distribution',
        type: 'pie',
        radius: '50%',
        data: Object.entries(filteredStats.tagDistribution).map(([key, value]) => ({
          value,
          name: key
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  // Field completeness bar chart configuration
  const fieldCompletenessOption = {
    title: {
      text: 'Field Completeness Analysis',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: ['Image', 'Query Content', 'Solution', 'Ground Truth Answer']
    },
    yAxis: {
      type: 'value',
      name: 'Count'
    },
    series: [
      {
        name: 'Completeness',
        type: 'bar',
        data: [
          {
            value: filteredStats.fieldCompleteness.image,
            itemStyle: { color: '#5470c6' }
          },
          {
            value: filteredStats.fieldCompleteness.query,
            itemStyle: { color: '#91cc75' }
          },
          {
            value: filteredStats.fieldCompleteness.solution,
            itemStyle: { color: '#fac858' }
          },
          {
            value: filteredStats.fieldCompleteness.gt_answer,
            itemStyle: { color: '#ee6666' }
          }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  // Time series line chart configuration
  const timeSeriesOption = {
    title: {
      text: 'Data Volume Over Time',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: filteredStats.timeSeriesData.map((item: any) => item.date),
      name: 'Date'
    },
    yAxis: {
      type: 'value',
      name: 'Data Count'
    },
    series: [
      {
        name: 'New Data',
        type: 'line',
        data: filteredStats.timeSeriesData.map((item: any) => item.count),
        smooth: true,
        itemStyle: {
          color: '#5470c6'
        },
        areaStyle: {
          color: 'rgba(84, 112, 198, 0.3)'
        }
      }
    ]
  };

  // Data quality radar chart configuration
  const qualityRadarOption = {
    title: {
      text: 'Data Quality Analysis',
      left: 'center'
    },
    tooltip: {},
    radar: {
      indicator: [
        { name: 'Data Completeness', max: 100 },
        { name: 'Image Coverage', max: 100 },
        { name: 'Tag Richness', max: 100 },
        { name: 'Content Quality', max: 100 },
        { name: 'Update Frequency', max: 100 }
      ]
    },
    series: [
      {
        name: 'Data Quality',
        type: 'radar',
        data: [
          {
            value: [
              Math.round((filteredStats.completedEntries / Math.max(filteredStats.totalEntries, 1)) * 100),
              Math.round((filteredStats.fieldCompleteness.image / Math.max(filteredStats.totalEntries, 1)) * 100),
              Math.min(Object.keys(filteredStats.tagDistribution).length * 20, 100),
              Math.round((filteredStats.fieldCompleteness.solution / Math.max(filteredStats.totalEntries, 1)) * 100),
              Math.min(filteredStats.timeSeriesData.length * 10, 100)
            ],
            name: 'Current Data Quality'
          }
        ]
      }
    ]
  };

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
          <DatabaseOutlined style={{ color: 'var(--primary-color)' }} />
          Data Visualization
        </h1>
        <p style={{ 
          margin: '8px 0 0 0', 
          color: 'var(--text-secondary)',
          fontSize: '16px'
        }}>
          View data statistics and analysis charts
        </p>
      </div>

      {/* Filter Controls */}
      <Card 
        style={{ 
          marginBottom: 24,
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-container)'
        }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <div>
              <label style={{ 
                marginRight: 8, 
                fontSize: '16px', 
                fontWeight: 500, 
                color: 'var(--text-primary)' 
              }}>
                Time Range:
              </label>
              <RangePicker
                onChange={(dates, dateStrings) => {
                  setDateRange(dateStrings[0] && dateStrings[1] ? dateStrings as [string, string] : null);
                }}
                style={{ 
                  width: '100%',
                  borderRadius: 'var(--border-radius)',
                  height: '40px'
                }}
                placeholder={['Start Date', 'End Date']}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card style={{
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-container)',
            height: '120px'
          }}>
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Total Data
                </span>
              }
              value={filteredStats.totalEntries}
              prefix={<DatabaseOutlined style={{ color: 'var(--primary-color)' }} />}
              valueStyle={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-container)',
            height: '120px'
          }}>
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Complete Data
                </span>
              }
              value={filteredStats.completedEntries}
              prefix={<CheckCircleOutlined style={{ color: 'var(--success-color)' }} />}
              valueStyle={{ color: 'var(--success-color)', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-container)',
            height: '120px'
          }}>
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  With Images
                </span>
              }
              value={filteredStats.fieldCompleteness.image}
              prefix={<PictureOutlined style={{ color: 'var(--warning-color)' }} />}
              valueStyle={{ color: 'var(--warning-color)', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Tag Types
                </span>
              }
              value={Object.keys(filteredStats.tagDistribution).length}
              prefix={<TagsOutlined style={{ color: 'var(--info-color)' }} />}
              valueStyle={{ color: 'var(--info-color)', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Tabs 
        defaultActiveKey="1" 
        style={{
          background: 'var(--bg-container)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '16px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)'
        }}
      >

      <TabPane tab="Data Trends" key="1">
        {/* Chart Area */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card 
              title="Tag Distribution"
              style={{
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}
            >
              <ReactECharts option={tagDistributionOption} style={{ height: '300px' }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              title="Field Completeness"
              style={{
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}
            >
              <ReactECharts option={fieldCompletenessOption} style={{ height: '300px' }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card 
              title="Data Trends"
              style={{
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}
            >
              <ReactECharts option={timeSeriesOption} style={{ height: '300px' }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              title="Quality Analysis"
              style={{
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}
            >
              <ReactECharts option={qualityRadarOption} style={{ height: '300px' }} />
            </Card>
          </Col>
        </Row>
      </TabPane>

      <TabPane tab="Detailed Statistics" key="2">
        <Table
          dataSource={[
            { key: '1', field: 'Image', count: filteredStats.fieldCompleteness.image, percentage: `${Math.round((filteredStats.fieldCompleteness.image / Math.max(filteredStats.totalEntries, 1)) * 100)}%` },
              { key: '2', field: 'Query Content', count: filteredStats.fieldCompleteness.query, percentage: `${Math.round((filteredStats.fieldCompleteness.query / Math.max(filteredStats.totalEntries, 1)) * 100)}%` },
              { key: '3', field: 'Solution', count: filteredStats.fieldCompleteness.solution, percentage: `${Math.round((filteredStats.fieldCompleteness.solution / Math.max(filteredStats.totalEntries, 1)) * 100)}%` },
              { key: '4', field: 'Standard Answer', count: filteredStats.fieldCompleteness.gt_answer, percentage: `${Math.round((filteredStats.fieldCompleteness.gt_answer / Math.max(filteredStats.totalEntries, 1)) * 100)}%` }
          ]}
          columns={[
            { title: 'Field', dataIndex: 'field', key: 'field' },
              { title: 'Complete Count', dataIndex: 'count', key: 'count' },
              { title: 'Completion Rate', dataIndex: 'percentage', key: 'percentage' }
          ]}
          pagination={false}
        />
      </TabPane>
      <TabPane tab="Tag Distribution Statistics" key="3">
        <Table
          dataSource={Object.entries(filteredStats.tagDistribution).map(([tag, count], index) => ({
            key: index.toString(),
            tag,
            count: count as number,
            percentage: `${Math.round(((count as number) / Math.max(filteredStats.totalEntries, 1)) * 100)}%`
          }))}
          columns={[
            { title: 'Tag', dataIndex: 'tag', key: 'tag' },
              { title: 'Count', dataIndex: 'count', key: 'count' },
              { title: 'Percentage', dataIndex: 'percentage', key: 'percentage' }
          ]}
          pagination={false}
          locale={{ emptyText: 'No tag data available' }}
        />
      </TabPane>
    </Tabs>
  </div>
  );
};

export default VisualizationPage;