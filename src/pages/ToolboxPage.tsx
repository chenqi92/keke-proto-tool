import React from 'react';
import { ToolboxInterface } from '@/components/Toolbox/ToolboxInterface';

export const ToolboxPage: React.FC = () => {
  const handleToolExecute = (toolId: string, result: any) => {
    console.log('Tool executed:', toolId, result);
    // Handle tool execution result
  };

  return (
    <ToolboxInterface
      mode="modal"
      onToolExecute={handleToolExecute}
    />
  );
};


