import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Play, FileText, Eye, Edit3, Download, Upload } from 'lucide-react';
import { ProtocolRepositoryService } from '@/services/ProtocolRepositoryService';

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

  const protocolService = ProtocolRepositoryService.getInstance();

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
        content: content,
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

  const handleExport = () => {
    try {
      if (!content.trim()) {
        setError('No content to export');
        return;
      }

      const blob = new Blob([content], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metadata?.name || 'protocol'}.kpt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Protocol exported successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to export protocol');
      console.error('Export error:', err);
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

  const getHighlightedContent = () => {
    if (!content.trim()) {
      return (
        <div className="text-gray-400 dark:text-gray-500 italic text-center py-8">
          No content to preview
        </div>
      );
    }

    // Enhanced syntax highlighting for YAML-like content
    return content
      .split('\n')
      .map((line, index) => {
        let highlightedLine = line;

        // Escape HTML first
        highlightedLine = highlightedLine
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Highlight comments first (to avoid conflicts)
        highlightedLine = highlightedLine.replace(
          /#(.*)$/g,
          '<span style="color: #6b7280; font-style: italic;">#$1</span>'
        );

        // Highlight main sections (meta, framing, fields, etc.)
        highlightedLine = highlightedLine.replace(
          /^(\s*)(meta|framing|fields|validation|conditions|functions|factor_codes)(\s*:)/g,
          '$1<span style="color: #dc2626; font-weight: bold;">$2</span><span style="color: #4b5563;">$3</span>'
        );

        // Highlight field names and properties
        highlightedLine = highlightedLine.replace(
          /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
          '$1<span style="color: #2563eb; font-weight: 600;">$2</span><span style="color: #4b5563;">:</span>'
        );

        // Highlight strings (quoted values)
        highlightedLine = highlightedLine.replace(
          /"([^"]*)"/g,
          '<span style="color: #059669;">"$1"</span>'
        );

        // Highlight single quoted strings
        highlightedLine = highlightedLine.replace(
          /'([^']*)'/g,
          '<span style="color: #059669;">\'$1\'</span>'
        );

        // Highlight numbers
        highlightedLine = highlightedLine.replace(
          /:\s*(\d+\.?\d*)\b/g,
          ': <span style="color: #7c3aed;">$1</span>'
        );

        // Highlight boolean values
        highlightedLine = highlightedLine.replace(
          /:\s*(true|false|null)\b/g,
          ': <span style="color: #ea580c;">$1</span>'
        );

        // Highlight array indicators
        highlightedLine = highlightedLine.replace(
          /^(\s*)-(\s)/g,
          '$1<span style="color: #0891b2;">-</span>$2'
        );

        return (
          <div key={index} className="flex hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded text-sm leading-5">
            <span className="text-gray-400 dark:text-gray-500 text-xs w-10 text-right mr-3 select-none flex-shrink-0 pt-0.5">
              {index + 1}
            </span>
            <span
              className="flex-1 whitespace-pre"
              dangerouslySetInnerHTML={{ __html: highlightedLine || '&nbsp;' }}
            />
          </div>
        );
      });
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
                <span className="hidden sm:inline">Import</span>
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
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isModified || isSaving}
            className="flex items-center whitespace-nowrap"
          >
            <Save className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleApply}
            disabled={!isModified || isApplying}
            className="flex items-center whitespace-nowrap"
          >
            <Play className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">{isApplying ? 'Applying...' : 'Apply'}</span>
          </Button>
          
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose} className="flex items-center whitespace-nowrap">
              <span className="hidden sm:inline">Close</span>
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

      {/* Combined Editor and Preview */}
      <div className="flex-1 flex gap-4 m-4 mt-2 overflow-hidden">
        {/* Editor Panel */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Edit3 className="w-4 h-4" />
              <span>Protocol Definition</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm border-none resize-none focus:outline-none overflow-auto"
              placeholder="Enter your protocol definition here..."
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* Live Preview Panel */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Live Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="h-full overflow-auto font-mono text-sm bg-gray-50 dark:bg-gray-800 p-4">
              <div className="space-y-0">
                {getHighlightedContent()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProtocolEditor;
