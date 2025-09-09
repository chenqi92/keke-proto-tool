import React, { useState } from 'react';
import { cn } from '@/utils';
import { ProtocolPlugin, ToolPlugin } from '@/types/plugins';
import { ProtocolPluginManager } from '@/components/plugins/ProtocolPluginManager.tsx';
import { ToolPluginManager } from '@/components/plugins/ToolPluginManager.tsx';
import {
  Puzzle,
  Network,
  Wrench,
  Store,
  Settings as SettingsIcon
} from 'lucide-react';

type PluginTab = 'protocol' | 'tool' | 'store' | 'settings';



export const PluginsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PluginTab>('protocol');

  // Protocol plugin handlers
  const handleProtocolInstall = (plugin: ProtocolPlugin) => {
    console.log(`Install protocol plugin: ${plugin.name}`);
  };

  const handleProtocolUninstall = (plugin: ProtocolPlugin) => {
    console.log(`Uninstall protocol plugin: ${plugin.name}`);
  };

  const handleProtocolToggle = (plugin: ProtocolPlugin) => {
    console.log(`Toggle protocol plugin: ${plugin.name}`);
  };

  const handleProtocolConfigure = (plugin: ProtocolPlugin) => {
    console.log(`Configure protocol plugin: ${plugin.name}`);
  };

  const handleUploadDefinition = (file: File) => {
    console.log(`Upload protocol definition: ${file.name}`);
  };

  // Tool plugin handlers
  const handleToolInstall = (plugin: ToolPlugin) => {
    console.log(`Install tool plugin: ${plugin.name}`);
  };

  const handleToolUninstall = (plugin: ToolPlugin) => {
    console.log(`Uninstall tool plugin: ${plugin.name}`);
  };

  const handleToolToggle = (plugin: ToolPlugin) => {
    console.log(`Toggle tool plugin: ${plugin.name}`);
  };

  const handleToolConfigure = (plugin: ToolPlugin) => {
    console.log(`Configure tool plugin: ${plugin.name}`);
  };

  const handleToolExecute = (plugin: ToolPlugin) => {
    console.log(`Execute tool plugin: ${plugin.name}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'protocol':
        return (
          <ProtocolPluginManager
            plugins={[]}
            onInstall={handleProtocolInstall}
            onUninstall={handleProtocolUninstall}
            onToggle={handleProtocolToggle}
            onConfigure={handleProtocolConfigure}
            onUploadDefinition={handleUploadDefinition}
          />
        );
      case 'tool':
        return (
          <ToolPluginManager
            plugins={[]}
            onInstall={handleToolInstall}
            onUninstall={handleToolUninstall}
            onToggle={handleToolToggle}
            onConfigure={handleToolConfigure}
            onExecute={handleToolExecute}
          />
        );
      case 'store':
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">插件商店</h3>
              <p>即将推出...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <SettingsIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">插件设置</h3>
              <p>即将推出...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Puzzle className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">插件管理</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('protocol')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors",
              activeTab === 'protocol'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Network className="w-4 h-4" />
            <span>协议插件</span>
          </button>
          <button
            onClick={() => setActiveTab('tool')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors",
              activeTab === 'tool'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Wrench className="w-4 h-4" />
            <span>工具插件</span>
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors",
              activeTab === 'store'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Store className="w-4 h-4" />
            <span>插件商店</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors",
              activeTab === 'settings'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>插件设置</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
};
