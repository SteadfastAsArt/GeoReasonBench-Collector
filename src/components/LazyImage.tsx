import React, { useState, useEffect, useRef } from 'react';
import { Image, Spin } from 'antd';
import { createImageLoader } from '../utils/performance';

interface LazyImageProps {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: React.ReactNode;
  fallback?: string;
  preview?: boolean;
}

const imageLoader = createImageLoader();

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  width,
  height,
  style,
  className,
  placeholder,
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIGZpbGw9IiNEOUQ5RDkiLz4KPC9zdmc+',
  preview = true
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(fallback);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load image when visible
  useEffect(() => {
    if (isVisible && src) {
      setLoading(true);
      setError(false);
      
      imageLoader.loadImage(src)
        .then(() => {
          setImageSrc(src);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
          setImageSrc(fallback);
        });
    }
  }, [isVisible, src, fallback]);

  const containerStyle: React.CSSProperties = {
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    ...style
  };

  return (
    <div ref={imgRef} style={containerStyle} className={className}>
      {loading && isVisible ? (
        placeholder || <Spin size="small" />
      ) : (
        <Image
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          preview={preview && !error}
          style={{
            objectFit: 'cover',
            width: '100%',
            height: '100%'
          }}
          fallback={fallback}
        />
      )}
    </div>
  );
};

export default LazyImage;