import React, { useState, useEffect } from 'react';
import { toolRegistry } from '@/services/ToolRegistry';
import { initializeTools } from '@/tools';

export const ToolRegistryDebug: React.FC = () => {
  const [registeredTools, setRegisteredTools] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshTools = () => {
    const tools = toolRegistry.getAll();
    console.log('Debug: All registered tools:', tools);
    setRegisteredTools(tools);
  };

  const initTools = async () => {
    try {
      console.log('Debug: Initializing tools...');
      await initializeTools();
      setIsInitialized(true);
      refreshTools();
      console.log('Debug: Tools initialized successfully');
    } catch (error) {
      console.error('Debug: Failed to initialize tools:', error);
    }
  };

  useEffect(() => {
    refreshTools();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">工具注册调试</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={initTools}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          初始化工具
        </button>
        
        <button
          onClick={refreshTools}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          刷新工具列表
        </button>
      </div>

      <div className="mb-4">
        <p><strong>初始化状态:</strong> {isInitialized ? '已初始化' : '未初始化'}</p>
        <p><strong>注册工具数量:</strong> {registeredTools.length}</p>
      </div>

      <div>
        <h4 className="font-medium mb-2">已注册的工具:</h4>
        {registeredTools.length === 0 ? (
          <p className="text-gray-500">没有注册的工具</p>
        ) : (
          <ul className="space-y-1">
            {registeredTools.map((reg, index) => (
              <li key={index} className="text-sm">
                <strong>{reg.tool.name}</strong> ({reg.tool.id}) - {reg.tool.category}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
