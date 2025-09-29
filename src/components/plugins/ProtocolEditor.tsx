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
        // For now, we'll use the initial content
        // In a real implementation, you'd load the actual protocol content
        setOriginalContent(content);
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
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata?.name || 'protocol'}.kpt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      setContent(fileContent);
    };
    reader.readAsText(file);
  };

  const getHighlightedContent = () => {
    // Simple syntax highlighting for YAML-like content
    return content
      .split('\n')
      .map((line, index) => {
        let highlightedLine = line;
        
        // Highlight keys (before colon)
        highlightedLine = highlightedLine.replace(
          /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
          '$1<span class="text-blue-600 font-semibold">$2</span>:'
        );
        
        // Highlight strings (quoted values)
        highlightedLine = highlightedLine.replace(
          /"([^"]*)"/g,
          '<span class="text-green-600">"$1"</span>'
        );
        
        // Highlight numbers
        highlightedLine = highlightedLine.replace(
          /:\s*(\d+\.?\d*)/g,
          ': <span class="text-purple-600">$1</span>'
        );
        
        // Highlight comments
        highlightedLine = highlightedLine.replace(
          /#(.*)$/g,
          '<span class="text-gray-500 italic">#$1</span>'
        );
        
        // Highlight special protocol sections
        highlightedLine = highlightedLine.replace(
          /^(\s*)(metadata|parsing|validation|factor_codes|examples)(\s*:)/g,
          '$1<span class="text-red-600 font-bold">$2</span>$3'
        );

        return (
          <div key={index} className="flex">
            <span className="text-gray-400 text-sm w-8 text-right mr-2 select-none">
              {index + 1}
            </span>
            <span 
              className="flex-1"
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
          <label htmlFor="import-file">
            <Button variant="outline" size="sm" asChild>
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                Import
              </span>
            </Button>
          </label>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isModified || isSaving}
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!isModified || isApplying}
          >
            <Play className="w-4 h-4 mr-1" />
            {isApplying ? 'Applying...' : 'Apply'}
          </Button>
          
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
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

      {/* Editor Tabs */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 w-fit">
            <TabsTrigger value="editor" className="flex items-center space-x-1">
              <Edit3 className="w-4 h-4" />
              <span>Editor</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 m-4 mt-2">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm border-none resize-none focus:outline-none"
                  placeholder="Enter your protocol definition here..."
                  spellCheck={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 m-4 mt-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-sm">Syntax Highlighted Preview</CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-auto">
                <div className="font-mono text-sm bg-gray-50 p-4 rounded border h-full overflow-auto">
                  {getHighlightedContent()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProtocolEditor;
