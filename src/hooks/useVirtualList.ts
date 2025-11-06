import { useState, useEffect, useMemo, useCallback } from 'react';
import { calculateVisibleItems } from '../utils/performance';

interface UseVirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualListResult<T> {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
  scrollToIndex: (index: number) => void;
}

export function useVirtualList<T>(
  items: T[],
  options: UseVirtualListOptions
): VirtualListResult<T> {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const { startIndex, endIndex } = useMemo(() => {
    return calculateVisibleItems(
      scrollTop,
      containerHeight,
      itemHeight,
      items.length,
      overscan
    );
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = index * itemHeight;
    setScrollTop(targetScrollTop);
  }, [itemHeight]);

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollToIndex
  };
}