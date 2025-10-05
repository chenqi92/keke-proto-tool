import React, { useState } from 'react';
import { cn } from '@/utils';
import { ProtocolPlugin } from '@/types/plugins';
import { ProtocolPluginManager } from '@/components/plugins/ProtocolPluginManager';
import { ProtocolStore } from '@/components/plugins/ProtocolStore';
import {
  Puzzle,
  Network,
  Store
} from 'lucide-react';

type PluginTab = 'protocol' | 'store';



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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'protocol':
        return (
          <ProtocolPluginManager
            onInstall={handleProtocolInstall}
            onUninstall={handleProtocolUninstall}
            onToggle={handleProtocolToggle}
            onConfigure={handleProtocolConfigure}
            onUploadDefinition={handleUploadDefinition}
          />
        );
      case 'store':
        return (
          <ProtocolStore
            onProtocolInstalled={(protocolId) => {
              console.log(`Protocol installed: ${protocolId}`);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Compact */}
      <div className="border-b border-border p-2 bg-muted/30">
        {/* Tabs only */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('protocol')}
            className={cn(
              "flex items-center space-x-1.5 px-2 py-1.5 text-xs rounded-md transition-colors",
              activeTab === 'protocol'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Network className="w-3.5 h-3.5" />
            <span>协议插件</span>
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={cn(
              "flex items-center space-x-1.5 px-2 py-1.5 text-xs rounded-md transition-colors",
              activeTab === 'store'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Store className="w-3.5 h-3.5" />
            <span>协议商店</span>
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
