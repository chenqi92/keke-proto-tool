import React from 'react';
import { X, Github, Mail, Bug, MessageSquare, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';

interface ReportIssuePageProps {
  onClose?: () => void;
}

export const ReportIssuePage: React.FC<ReportIssuePageProps> = ({ onClose }) => {
  const handleLinkClick = async (href: string) => {
    console.log('[ReportIssuePage] Attempting to open link:', href);
    try {
      await openUrl(href);
      console.log('[ReportIssuePage] Successfully opened link');
    } catch (error) {
      console.error('[ReportIssuePage] Failed to open link:', error);
      // Fallback to window.open
      try {
        if (href.startsWith('http')) {
          window.open(href, '_blank');
        } else if (href.startsWith('mailto:')) {
          window.open(href);
        }
      } catch (fallbackError) {
        console.error('[ReportIssuePage] Fallback also failed:', fallbackError);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Bug className="w-8 h-8 text-destructive" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">报告问题</h2>
              <p className="text-sm text-muted-foreground">Report an Issue</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Introduction */}
          <div className="space-y-2">
            <p className="text-foreground">
              感谢您帮助改进 ProtoTool！如果您遇到了问题或有功能建议，请通过以下方式告诉我们：
            </p>
          </div>

          {/* Report Options */}
          <div className="space-y-4">
            {/* GitHub Issues */}
            <div className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="flex items-start space-x-3">
                <Github className="w-6 h-6 text-foreground mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">GitHub Issues</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    在 GitHub 上提交问题报告或功能请求。这是最推荐的方式，可以让其他用户也能看到和参与讨论。
                  </p>
                  <button
                    onClick={() => handleLinkClick('https://github.com/chenqi92/keke-proto-tool/issues/new')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <span>创建 Issue</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Email Contact */}
            <div className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="flex items-start space-x-3">
                <Mail className="w-6 h-6 text-foreground mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">邮件联系</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    如果您希望私下报告问题或有其他咨询，可以通过邮件联系我们。
                  </p>
                  <button
                    onClick={() => handleLinkClick('mailto:hi@kkape.com?subject=ProtoTool Issue Report')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                  >
                    <span>发送邮件</span>
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Discussions */}
            <div className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-6 h-6 text-foreground mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">GitHub Discussions</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    如果您有使用问题、功能建议或想与社区交流，可以在 GitHub Discussions 中发起讨论。
                  </p>
                  <button
                    onClick={() => handleLinkClick('https://github.com/chenqi92/keke-proto-tool/discussions')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                  >
                    <span>参与讨论</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">💡 提交问题时的建议</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>清楚描述问题的重现步骤</li>
              <li>提供您的操作系统和 ProtoTool 版本信息</li>
              <li>如果可能，附上截图或错误日志</li>
              <li>说明预期行为和实际行为的差异</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              感谢您的反馈，这将帮助我们不断改进 ProtoTool
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportIssuePage;

