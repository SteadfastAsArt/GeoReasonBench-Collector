import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  currentData: T[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  getPageInfo: () => {
    start: number;
    end: number;
    total: number;
  };
}

export function usePagination<T>({
  data,
  pageSize = 20,
  initialPage = 1
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / currentPageSize);

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * currentPageSize;
    const endIndex = startIndex + currentPageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, currentPageSize]);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const setPageSize = (size: number) => {
    setCurrentPageSize(size);
    // Reset to first page when page size changes
    setCurrentPage(1);
  };

  const getPageInfo = () => {
    const start = (currentPage - 1) * currentPageSize + 1;
    const end = Math.min(currentPage * currentPageSize, totalItems);
    return { start, end, total: totalItems };
  };

  // Reset to first page when data changes significantly
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return {
    currentPage,
    pageSize: currentPageSize,
    totalPages,
    totalItems,
    currentData,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    getPageInfo
  };
}