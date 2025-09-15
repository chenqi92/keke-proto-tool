import React from 'react';

// 骨架屏组件
export const PageSkeleton: React.FC = () => (
  <div className="h-full flex flex-col space-y-4 p-6 animate-pulse">
    <div className="h-8 bg-muted rounded-lg w-1/3" />
    <div className="flex-1 space-y-3">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-4/6" />
      <div className="space-y-2 mt-6">
        <div className="h-20 bg-muted rounded-lg" />
        <div className="h-20 bg-muted rounded-lg" />
        <div className="h-20 bg-muted rounded-lg" />
      </div>
    </div>
  </div>
);
