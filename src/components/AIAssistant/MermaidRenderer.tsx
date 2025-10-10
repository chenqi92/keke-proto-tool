/**
 * Mermaid 图表渲染组件
 */

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      try {
        setError(null);
        // 生成唯一 ID
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // 渲染图表
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className={`p-2 bg-destructive/10 border border-destructive/20 rounded text-xs ${className}`}>
        <p className="text-destructive font-medium">图表渲染失败</p>
        <p className="text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-container overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

