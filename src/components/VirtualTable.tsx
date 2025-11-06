import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Table, TableProps } from 'antd';
import { useVirtualList } from '../hooks/useVirtualList';
import { throttle } from '../utils/performance';

interface VirtualTableProps<T> extends Omit<TableProps<T>, 'dataSource' | 'pagination' | 'onScroll'> {
  dataSource: T[];
  itemHeight?: number;
  height?: number;
  onScroll?: (scrollTop: number) => void;
}

const VirtualTable = <T extends Record<string, any>>({
  dataSource,
  itemHeight = 54,
  height = 400,
  onScroll,
  ...tableProps
}: VirtualTableProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用虚拟列表hook
  const {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY
  } = useVirtualList(dataSource, {
    itemHeight,
    containerHeight: height,
    overscan: 5
  });

  // 节流的滚动处理
  const throttledSetScrollTop = useMemo(
    () => throttle((scrollTop: number) => {
      setScrollTop(scrollTop);
      onScroll?.(scrollTop);
    }, 16),
    [onScroll]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    throttledSetScrollTop(scrollTop);
  }, [throttledSetScrollTop]);

  // 为虚拟项添加key
  const virtualDataSource = useMemo(() => {
    return visibleItems.map((item, index) => ({
      ...item,
      __virtualIndex: startIndex + index
    }));
  }, [visibleItems, startIndex]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        overflow: 'auto',
        border: '1px solid #f0f0f0'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <Table
            {...tableProps}
            dataSource={virtualDataSource}
            pagination={false}
            scroll={{ y: undefined }}
            rowKey={(record) => record.__virtualIndex || record.id}
            size="small"
            style={{ marginBottom: 0 }}
          />
        </div>
      </div>
    </div>
  );
};

export default VirtualTable;