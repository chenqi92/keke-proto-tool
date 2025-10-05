/**
 * Protocol Store Component
 * 
 * Browse and download protocols from GitHub repository
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/Common/Toast';
import {
  protocolStoreService,
  ProtocolStoreItem
} from '@/services/ProtocolStoreService';
import {
  protocolRepositoryService
} from '@/services/ProtocolRepositoryService';
import {
  Download,
  Search,
  RefreshCw,
  Package,
  CheckCircle,
  AlertCircle,
  Star,
  Tag,
  User,
  Calendar,
  FileText,
  Loader2
} from 'lucide-react';

interface ProtocolStoreProps {
  onProtocolInstalled?: (protocolId: string) => void;
}

export const ProtocolStore: React.FC<ProtocolStoreProps> = ({ onProtocolInstalled }) => {
  const [protocols, setProtocols] = useState<ProtocolStoreItem[]>([]);
  const [filteredProtocols, setFilteredProtocols] = useState<ProtocolStoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolStoreItem | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [installedProtocols, setInstalledProtocols] = useState<Set<string>>(new Set());
  
  const toast = useToast();

  // Load protocols on mount
  useEffect(() => {
    loadProtocols();
    loadInstalledProtocols();
  }, []);

  // Filter protocols when search or category changes
  useEffect(() => {
    let filtered = protocols;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = protocolStoreService.filterByCategory(filtered, selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = protocolStoreService.searchProtocols(filtered, searchQuery);
    }

    setFilteredProtocols(filtered);
  }, [protocols, searchQuery, selectedCategory]);

  const loadProtocols = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const protocolList = await protocolStoreService.fetchProtocols(forceRefresh);
      setProtocols(protocolList);
      
      // Extract categories
      const cats = protocolStoreService.getCategories(protocolList);
      setCategories(cats);

      if (forceRefresh) {
        toast.success('刷新成功', `已加载 ${protocolList.length} 个协议`);
      }
    } catch (error) {
      console.error('Failed to load protocols:', error);
      toast.error('加载失败', error instanceof Error ? error.message : '无法从协议商店加载协议');
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledProtocols = async () => {
    try {
      const installed = await protocolRepositoryService.listProtocols();
      const installedNames = new Set(installed.map(p => p.name));
      setInstalledProtocols(installedNames);
    } catch (error) {
      console.error('Failed to load installed protocols:', error);
    }
  };

  const handleDownload = async (protocol: ProtocolStoreItem) => {
    try {
      setDownloadingIds(prev => new Set(prev).add(protocol.id));

      // Download protocol content
      const content = await protocolStoreService.downloadProtocol(protocol);

      // Import to local repository
      const protocolId = await protocolRepositoryService.importProtocol({
        name: protocol.name,
        content,
        description: protocol.description,
        category: protocol.category,
        tags: protocol.tags
      });

      toast.success('安装成功', `协议 "${protocol.name}" 已成功安装`);

      // Update installed protocols
      await loadInstalledProtocols();

      // Notify parent
      if (onProtocolInstalled) {
        onProtocolInstalled(protocolId);
      }
    } catch (error) {
      console.error('Failed to download protocol:', error);
      toast.error('安装失败', error instanceof Error ? error.message : '无法安装协议');
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(protocol.id);
        return next;
      });
    }
  };

  const handleRefresh = () => {
    loadProtocols(true);
  };

  const isInstalled = (protocol: ProtocolStoreItem): boolean => {
    return installedProtocols.has(protocol.name);
  };

  const isDownloading = (protocol: ProtocolStoreItem): boolean => {
    return downloadingIds.has(protocol.id);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Compact single row */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        {/* Search - Shorter */}
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-2 py-1.5 h-8 text-xs"
          />
        </div>

        {/* Category Filter - Compact */}
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
          className="h-8 px-2 text-xs"
        >
          全部
        </Button>
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="h-8 px-2 text-xs"
          >
            {category}
          </Button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh Button */}
        <div title="刷新协议列表">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 px-2 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1", loading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* Protocol List */}
      <div className="flex-1 overflow-auto p-4">
        {loading && protocols.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">正在加载协议...</p>
            </div>
          </div>
        ) : filteredProtocols.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchQuery ? '未找到匹配的协议' : '暂无协议'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? '尝试使用其他关键词搜索' : '点击刷新按钮加载协议'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProtocols.map(protocol => (
              <div
                key={protocol.id}
                className={cn(
                  "border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer",
                  selectedProtocol?.id === protocol.id && "border-primary bg-primary/5"
                )}
                onClick={() => setSelectedProtocol(protocol)}
              >
                {/* Protocol Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate mb-1">
                      {protocol.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>v{protocol.version}</span>
                      {protocol.verified && (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>
                  </div>
                  {isInstalled(protocol) && (
                    <Badge variant="secondary" className="text-xs">
                      已安装
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {protocol.description || '暂无描述'}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{protocol.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{protocol.category}</span>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isInstalled(protocol) || isDownloading(protocol)}
                  onClick={() => handleDownload(protocol)}
                >
                  {isDownloading(protocol) ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      安装中...
                    </>
                  ) : isInstalled(protocol) ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-2" />
                      已安装
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 mr-2" />
                      安装
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Container */}
      <toast.ToastContainer />
    </div>
  );
};

