import React, {useState, useEffect} from 'react';
import {cn} from '@/utils';
import { backendLogService, LogEntry } from '@/services/BackendLogService';
import { ConfirmationModal, MessageModal, ExportModal, ExportOptions } from '@/components/Common';
import {
    Search,
    Download,
    Trash2,
    Eye,
    FileText,
    AlertCircle,
    CheckCircle,
    Info,
    Network,
    MessageSquare,
    ArrowUp,
    ArrowDown,
    Server,
    Monitor,
    Zap,
    Settings
} from 'lucide-react';

// LogEntry interface is now imported from LogService

const getLevelIcon = (level: string) => {
    switch (level) {
        case 'error':
            return <AlertCircle className="w-4 h-4 text-red-500"/>;
        case 'warning':
            return <AlertCircle className="w-4 h-4 text-yellow-500"/>;
        case 'info':
            return <CheckCircle className="w-4 h-4 text-blue-500"/>;
        case 'debug':
            return <Info className="w-4 h-4 text-gray-500"/>;
        default:
            return <Info className="w-4 h-4 text-gray-500"/>;
    }
};

const getLevelColor = (level: string) => {
    switch (level) {
        case 'error':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'warning':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'info':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'debug':
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
};

// 获取日志类别图标
const getCategoryIcon = (log: LogEntry) => {
    const { category, direction } = log;

    switch (category) {
        case 'network':
            return <Network className="w-4 h-4 text-green-500"/>;
        case 'message':
            if (direction === 'in') {
                return <ArrowDown className="w-4 h-4 text-blue-500"/>;
            } else if (direction === 'out') {
                return <ArrowUp className="w-4 h-4 text-orange-500"/>;
            }
            return <MessageSquare className="w-4 h-4 text-purple-500"/>;
        case 'protocol':
            return <Settings className="w-4 h-4 text-indigo-500"/>;
        case 'system':
            return <Monitor className="w-4 h-4 text-gray-500"/>;
        case 'console':
            return <FileText className="w-4 h-4 text-gray-400"/>;
        default:
            return getLevelIcon(log.level);
    }
};

// 获取日志类别颜色
const getCategoryColor = (log: LogEntry) => {
    const { category, direction } = log;

    switch (category) {
        case 'network':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'message':
            if (direction === 'in') {
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            } else if (direction === 'out') {
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            }
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'protocol':
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
        case 'system':
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        case 'console':
            return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
        default:
            return getLevelColor(log.level);
    }
};

// 获取日志类别标签文本
const getCategoryLabel = (log: LogEntry) => {
    const { category, direction } = log;

    switch (category) {
        case 'network':
            return '网络';
        case 'message':
            if (direction === 'in') {
                return '接收';
            } else if (direction === 'out') {
                return '发送';
            }
            return '消息';
        case 'protocol':
            return '协议';
        case 'system':
            return '系统';
        case 'console':
            return '控制台';
        default:
            return log.level.toUpperCase();
    }
};

export const LogsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState('all');
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [sessionFilter, setSessionFilter] = useState<string | null>(null);
    const [sessionName, setSessionName] = useState<string>('');
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Modal states
    const [showExportModal, setShowExportModal] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showMessage, setShowMessage] = useState<{
        type: 'success' | 'error' | 'info' | 'warning';
        title: string;
        message: string;
    } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // 初始化日志数据
    useEffect(() => {
        const updateLogs = async () => {
            try {
                const allLogs = await backendLogService.getAllLogs();
                setLogs(allLogs);
            } catch (error) {
                console.error('Failed to load logs:', error);
            }
        };

        // 初始加载
        updateLogs();

        // 监听新日志添加
        const handleLogAdded = () => {
            updateLogs();
        };

        backendLogService.on('log-added', handleLogAdded);
        backendLogService.on('logs-cleared', updateLogs);

        return () => {
            backendLogService.off('log-added', handleLogAdded);
            backendLogService.off('logs-cleared', updateLogs);
        };
    }, []);

    // 监听日志过滤设置事件
    useEffect(() => {
        const handleSetLogFilter = (event: CustomEvent) => {
            const { sessionId, sessionName } = event.detail;
            setSessionFilter(sessionId);
            setSessionName(sessionName);
        };

        window.addEventListener('set-log-filter', handleSetLogFilter as EventListener);

        return () => {
            window.removeEventListener('set-log-filter', handleSetLogFilter as EventListener);
        };
    }, []);

    const levels = ['info', 'warning', 'error', 'debug'];
    const categories = [
        { value: 'network', label: '网络' },
        { value: 'message', label: '消息' },
        { value: 'protocol', label: '协议' },
        { value: 'system', label: '系统' },
        { value: 'console', label: '控制台' }
    ];
    const timeRanges = [
        {value: 'all', label: '全部时间'},
        {value: 'today', label: '今天'},
        {value: '24h', label: '24小时'},
        {value: '7d', label: '7天'},
        {value: '30d', label: '30天'}
    ];

    // 使用BackendLogService的过滤功能
    const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);

    // 实时过滤日志
    useEffect(() => {
        const filterLogs = async () => {
            try {
                const filtered = await backendLogService.getFilteredLogs({
                    sessionId: sessionFilter || undefined,
                    level: selectedLevel as any,
                    category: selectedCategory as any,
                    timeRange: selectedTimeRange as any,
                    searchQuery: searchQuery || undefined
                });
                setFilteredLogs(filtered);
            } catch (error) {
                console.error('Failed to filter logs:', error);
                setFilteredLogs([]);
            }
        };

        filterLogs();
    }, [logs, sessionFilter, selectedLevel, selectedCategory, selectedTimeRange, searchQuery]);

    const formatTimestamp = (timestamp: Date) => {
        const dateStr = timestamp.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const ms = timestamp.getMilliseconds().toString().padStart(3, '0');
        return `${dateStr}.${ms}`;
    };

    // 导出日志
    const handleExportLogs = async (options: ExportOptions) => {
        const currentFilters = {
            sessionId: sessionFilter || undefined,
            level: selectedLevel as any,
            category: selectedCategory as any,
            timeRange: selectedTimeRange as any,
            searchQuery: searchQuery || undefined
        };

        setIsExporting(true);
        try {
            const exportPath = await backendLogService.exportLogs(
                currentFilters,
                options.format,
                options.customPath,
                options.customFilename
            );
            setShowExportModal(false);
            setShowMessage({
                type: 'success',
                title: '导出成功',
                message: `日志已导出到: ${exportPath}`
            });
        } catch (error) {
            console.error('Export failed:', error);
            setShowExportModal(false);
            setShowMessage({
                type: 'error',
                title: '导出失败',
                message: String(error)
            });
        } finally {
            setIsExporting(false);
        }
    };

    // 清理日志
    const handleClearLogs = async () => {
        setIsClearing(true);
        try {
            await backendLogService.clearLogs();
            setShowClearConfirm(false);
            setShowMessage({
                type: 'success',
                title: '清理完成',
                message: '所有日志已清理完成'
            });
        } catch (error) {
            console.error('Clear logs failed:', error);
            setShowClearConfirm(false);
            setShowMessage({
                type: 'error',
                title: '清理失败',
                message: String(error)
            });
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-semibold">日志管理</h1>
                        {sessionFilter && (
                            <p className="text-sm text-muted-foreground mt-1">
                                正在查看会话: <span className="font-medium text-foreground">{sessionName}</span>
                                <button
                                    onClick={() => {
                                        setSessionFilter(null);
                                        setSessionName('');
                                    }}
                                    className="ml-2 text-xs text-primary hover:underline"
                                >
                                    清除过滤
                                </button>
                            </p>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center space-x-2 px-3 py-1.5 border border-border rounded-md hover:bg-accent text-sm">
                            <Download className="w-4 h-4"/>
                            <span>导出</span>
                        </button>
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="flex items-center space-x-2 px-3 py-1.5 border border-border rounded-md hover:bg-accent text-sm">
                            <Trash2 className="w-4 h-4"/>
                            <span>清理</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <input
                            type="text"
                            placeholder="搜索日志..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Level Filter */}
                    <select
                        value={selectedLevel || ''}
                        onChange={(e) => setSelectedLevel(e.target.value || null)}
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-24"
                    >
                        <option value="">所有级别</option>
                        {levels.map(level => (
                            <option key={level} value={level}>
                                {level.toUpperCase()}
                            </option>
                        ))}
                    </select>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-24"
                    >
                        <option value="">所有类别</option>
                        {categories.map(category => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>

                    {/* Time Range */}
                    <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-24"
                    >
                        {timeRanges.map(range => (
                            <option key={range.value} value={range.value}>
                                {range.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Log List */}
                <div className="flex-1 overflow-auto pb-12">
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50"/>
                                <h3 className="text-lg font-semibold mb-2">暂无日志</h3>
                                <p>没有找到匹配的日志条目</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className={cn(
                                        "p-2 hover:bg-accent cursor-auto transition-colors",
                                        selectedLog?.id === log.id && "bg-primary/10 border-l-2 border-l-primary"
                                    )}
                                    onClick={() => setSelectedLog(log)}
                                >
                                    <div className="flex items-start space-x-2">
                                        <div className="mt-0.5">
                                            {getCategoryIcon(log)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-0.5">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium",
                            getCategoryColor(log)
                        )}>
                          {getCategoryLabel(log)}
                        </span>
                                                {log.level !== 'info' && (
                                                    <span className={cn(
                                                        "px-1 py-0.5 rounded text-xs font-medium",
                                                        getLevelColor(log.level)
                                                    )}>
                                                        {log.level.toUpperCase()}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                          {log.source}
                        </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                          {formatTimestamp(log.timestamp)}
                        </span>
                                            </div>
                                            <p className="text-xs text-foreground leading-tight">
                                                {log.message}
                                            </p>
                                            {/* 显示额外的消息详情 */}
                                            {(log.clientId || log.dataSize || log.protocol) && (
                                                <div className="flex items-center space-x-2 mt-1">
                                                    {log.clientId && (
                                                        <span className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                                                            客户端: {log.clientId}
                                                        </span>
                                                    )}
                                                    {log.dataSize && (
                                                        <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs text-blue-600 dark:text-blue-400">
                                                            {log.dataSize} bytes
                                                        </span>
                                                    )}
                                                    {log.protocol && (
                                                        <span className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900 rounded text-xs text-purple-600 dark:text-purple-400">
                                                            {log.protocol}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="p-0.5 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="查看详情"
                                        >
                                            <Eye className="w-3 h-3"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Log Details */}
                {selectedLog && (
                    <div className="w-96 border-l border-border bg-card flex flex-col">
                        <div className="p-4 border-b border-border shrink-0">
                            <h3 className="font-semibold">日志详情</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 log-details-container" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                    .log-details-container::-webkit-scrollbar {
                                        display: none;
                                    }
                                `
                            }} />
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">时间</label>
                                <p className="font-mono text-sm mt-1">
                                    {formatTimestamp(selectedLog.timestamp)}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">类别</label>
                                <div className="mt-1 flex items-center space-x-2">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                        getCategoryColor(selectedLog)
                                    )}>
                                        {getCategoryLabel(selectedLog)}
                                    </span>
                                    {selectedLog.level !== 'info' && (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            getLevelColor(selectedLog.level)
                                        )}>
                                            {selectedLog.level.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">来源</label>
                                <p className="text-sm mt-1">{selectedLog.source}</p>
                            </div>
                            {selectedLog.sessionName && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">会话</label>
                                    <p className="text-sm mt-1">{selectedLog.sessionName}</p>
                                </div>
                            )}
                            {selectedLog.clientId && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">客户端ID</label>
                                    <p className="text-sm mt-1 font-mono">{selectedLog.clientId}</p>
                                </div>
                            )}
                            {selectedLog.protocol && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">协议</label>
                                    <p className="text-sm mt-1">{selectedLog.protocol}</p>
                                </div>
                            )}
                            {selectedLog.dataSize && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">数据大小</label>
                                    <p className="text-sm mt-1">{selectedLog.dataSize} bytes</p>
                                </div>
                            )}
                            {selectedLog.direction && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">方向</label>
                                    <div className="mt-1 flex items-center space-x-1">
                                        {selectedLog.direction === 'in' ? (
                                            <>
                                                <ArrowDown className="w-4 h-4 text-blue-500"/>
                                                <span className="text-sm text-blue-600">接收</span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUp className="w-4 h-4 text-orange-500"/>
                                                <span className="text-sm text-orange-600">发送</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">消息</label>
                                <p className="text-sm mt-1">{selectedLog.message}</p>
                            </div>
                            {selectedLog.details && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">详细信息</label>
                                    <pre className="text-xs mt-1 p-3 bg-muted rounded-md overflow-auto font-mono">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="border-t border-border p-2 bg-muted/30 shrink-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>显示 {filteredLogs.length} / {logs.length} 条日志</span>
                    <div className="flex items-center space-x-4">
                        <span>错误: {logs.filter(l => l.level === 'error').length}</span>
                        <span>警告: {logs.filter(l => l.level === 'warning').length}</span>
                        <span>信息: {logs.filter(l => l.level === 'info').length}</span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExportLogs}
                isLoading={isExporting}
            />

            <ConfirmationModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearLogs}
                title="清理日志"
                message="确定要清理所有日志吗？此操作不可撤销。"
                type="warning"
                confirmText="确认清理"
                isLoading={isClearing}
            />

            {showMessage && (
                <MessageModal
                    isOpen={true}
                    onClose={() => setShowMessage(null)}
                    title={showMessage.title}
                    message={showMessage.message}
                    type={showMessage.type}
                />
            )}
        </div>
    );
};
