import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Button, Space, Typography, Slider } from 'antd';
import { EyeOutlined, EditOutlined, ExpandAltOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import 'katex/dist/katex.min.css';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const { Text } = Typography;

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  label?: string;
  resizable?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Please enter content...',
  height = 200,
  label,
  resizable = true
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [currentHeight, setCurrentHeight] = useState(height);
  const [showHeightControl, setShowHeightControl] = useState(false);

  // Bottom-right drag resize support
  const minHeight = 150;
  const maxHeight = 800;
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(currentHeight);

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    const next = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + deltaY));
    setCurrentHeight(next);
  };

  const handleMouseUp = () => {
    if (!resizingRef.current) return;
    resizingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const onMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = currentHeight;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleChange = (val?: string) => {
    onChange(val || '');
  };

  return (
    <div>
      {label && (
        <div style={{ marginBottom: 8 }}>
          <Text strong>{label}</Text>
          <Space style={{ float: 'right' }}>
            {resizable && (
              <Button
                size="small"
                type={showHeightControl ? 'primary' : 'default'}
                icon={<ExpandAltOutlined />}
                onClick={() => setShowHeightControl(!showHeightControl)}
                title="调整高度"
              >
                高度
              </Button>
            )}
            <Button
              size="small"
              type={mode === 'edit' ? 'primary' : 'default'}
              icon={<EditOutlined />}
              onClick={() => setMode('edit')}
            >
              Edit
            </Button>
            <Button
              size="small"
              type={mode === 'preview' ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => setMode('preview')}
            >
              Preview
            </Button>
          </Space>
        </div>
      )}
      
      {showHeightControl && resizable && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
          <Text style={{ fontSize: 12, color: '#666' }}>编辑器高度: {currentHeight}px</Text>
          <Slider
            min={150}
            max={800}
            value={currentHeight}
            onChange={setCurrentHeight}
            style={{ margin: '8px 0 4px 0' }}
          />
        </div>
      )}
      
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, position: 'relative' }}>
        <MDEditor
          value={value}
          onChange={handleChange}
          preview={mode === 'preview' ? 'preview' : 'edit'}
          hideToolbar={mode === 'preview'}
          visibleDragbar={false}
          height={currentHeight}
          data-color-mode="light"
          previewOptions={{
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
          }}
          style={{
            backgroundColor: 'transparent'
          }}
        />

        {resizable && (
          <div
            onMouseDown={onMouseDownResize}
            title="拖拽调整高度"
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              width: 16,
              height: 16,
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              background: 'var(--bg-container)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              cursor: 'ns-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.85,
              zIndex: 2
            }}
          >
            <div style={{
              width: 10,
              height: 2,
              background: 'var(--border-color)'
            }} />
          </div>
        )}
      </div>
      
      {!value && mode === 'edit' && (
        <div style={{ 
          position: 'absolute', 
          top: label ? 60 : 32, 
          left: 12, 
          color: '#bfbfbf',
          pointerEvents: 'none',
          zIndex: 1
        }}>
          {placeholder}
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;