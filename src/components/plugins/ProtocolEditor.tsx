import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Play, FileText, Edit3, Download, Upload } from 'lucide-react';
import { ProtocolRepositoryService } from '@/services/ProtocolRepositoryService';
import { MessageModal } from '@/components/Common/MessageModal';
import { invoke } from '@tauri-apps/api/core';

interface ProtocolEditorProps {
  protocolId?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onClose?: () => void;
}

interface ProtocolMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
}

export const ProtocolEditor: React.FC<ProtocolEditorProps> = ({
  protocolId,
  initialContent = '',
  onSave,
  onClose
}) => {
  const [content, setContent] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [metadata, setMetadata] = useState<ProtocolMetadata | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dialog states
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDialogContent, setExportDialogContent] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ title: '', message: '', type: 'info' });

  const protocolService = ProtocolRepositoryService.getInstance();

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsModified(newContent !== originalContent);
  };

  useEffect(() => {
    if (protocolId) {
      loadProtocol();
    }
  }, [protocolId]);

  useEffect(() => {
    setIsModified(content !== originalContent);
  }, [content, originalContent]);

  const loadProtocol = async () => {
    if (!protocolId) return;

    try {
      // Load protocol metadata and content
      const protocols = await protocolService.listProtocols();
      const protocol = protocols.find(p => p.id === protocolId);

      if (protocol) {
        setMetadata(protocol);

        // Load the actual protocol content
        const protocolContent = await protocolService.getProtocolContent(protocolId);
        setContent(protocolContent);
        setOriginalContent(protocolContent);
      }
    } catch (err) {
      setError(`Failed to load protocol: ${err}`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (onSave) {
        onSave(content);
      }
      
      // Save to file system or update protocol
      setOriginalContent(content);
      setSuccess('Protocol saved successfully!');
    } catch (err) {
      setError(`Failed to save protocol: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    setError(null);
    setSuccess(null);

    try {
      // Import the modified protocol
      const request = {
        name: metadata?.name || 'Modified Protocol',
        content,
        description: 'Modified protocol from editor',
        category: metadata?.category || 'custom',
        tags: metadata?.tags || ['modified']
      };

      await protocolService.importProtocol(request);
      setSuccess('Protocol applied successfully!');
      setOriginalContent(content);
    } catch (err) {
      setError(`Failed to apply protocol: ${err}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleExport = async () => {
    try {
      if (!content.trim()) {
        setExportDialogContent({
          title: '导出失败',
          message: '没有内容可以导出，请先编辑协议内容。',
          type: 'error'
        });
        setShowExportDialog(true);
        return;
      }

      // 使用 Tauri invoke 命令调用后端文件保存功能
      const result = await invoke<{ success: boolean; path?: string; error?: string }>('save_file_dialog', {
        defaultPath: `${metadata?.name || 'protocol'}.kpt`,
        content,
        filters: [
          {
            name: 'KPT Protocol Files',
            extensions: ['kpt']
          },
          {
            name: 'Text Files',
            extensions: ['txt']
          }
        ]
      });

      if (result.success && result.path) {
        setExportDialogContent({
          title: '导出成功',
          message: `协议文件已成功导出到：\n${result.path}`,
          type: 'success'
        });
        setShowExportDialog(true);
      } else if (result.error) {
        setExportDialogContent({
          title: '导出失败',
          message: `导出协议时发生错误：${result.error}`,
          type: 'error'
        });
        setShowExportDialog(true);
      }
      // 如果用户取消，不显示任何提示
    } catch (err) {
      console.error('Export error:', err);
      setExportDialogContent({
        title: '导出失败',
        message: `导出协议时发生错误：${err}`,
        type: 'error'
      });
      setShowExportDialog(true);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        if (fileContent) {
          setContent(fileContent);
          setSuccess('Protocol imported successfully');
          setTimeout(() => setSuccess(''), 3000);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Failed to import protocol');
      console.error('Import error:', err);
    }

    // Reset the input value so the same file can be imported again
    event.target.value = '';
  };



  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <FileText className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-semibold">
              {metadata?.name || 'Protocol Editor'}
            </h2>
            {metadata && (
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{metadata.category}</Badge>
                <span className="text-sm text-gray-500">v{metadata.version}</span>
                {isModified && (
                  <Badge variant="destructive" className="text-xs">Modified</Badge>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".kpt,.yaml,.yml"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <label htmlFor="import-file" className="cursor-pointer">
            <Button variant="outline" size="sm">
              <span className="flex items-center whitespace-nowrap">
                <Upload className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="hidden sm:inline">导入</span>
              </span>
            </Button>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">导出</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isModified || isSaving}
            className="flex items-center whitespace-nowrap"
          >
            <Save className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">{isSaving ? '保存中...' : '保存'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleApply}
            disabled={!isModified || isApplying}
            className="flex items-center whitespace-nowrap"
          >
            <Play className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">{isApplying ? '应用中...' : '应用'}</span>
          </Button>

          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose} className="flex items-center whitespace-nowrap">
              <span className="hidden sm:inline">关闭</span>
              <span className="sm:hidden">×</span>
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="m-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="m-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Editor Only */}
      <div className="flex-1 m-4 mt-2 overflow-hidden">
        {/* Editor Panel */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Edit3 className="w-4 h-4" />
              <span>Protocol Editor</span>
              <Badge variant="secondary" className="ml-auto text-xs">KPT 1.1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your protocol definition here..."
              spellCheck={false}
              style={{ tabSize: 2, lineHeight: '1.5' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Export Dialog */}
      <MessageModal
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        title={exportDialogContent.title}
        message={exportDialogContent.message}
        type={exportDialogContent.type}
      />
    </div>
  );
};

export default ProtocolEditor;
