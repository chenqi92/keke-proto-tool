import React, {useState, useEffect} from 'react';
import {cn} from '@/utils';
import {
    Search,
    Download,
    Trash2,
    Eye,
    FileText,
    AlertCircle,
    CheckCircle,
    Info
} from 'lucide-react';

interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'debug';
    source: string;
    message: string;
    details?: any;
}

const mockLogs: LogEntry[] = [
    {
        id: '1',
        timestamp: new Date(),
        level: 'info',
        source: 'TCP Client',
        message: '连接建立成功',
        details: {host: '192.168.1.100', port: 8080}
    },
    {
        id: '2',
        timestamp: new Date(Date.now() - 60000),
        level: 'warning',
        source: 'Protocol Parser',
        message: '解析警告：未知字段类型',
        details: {field: 'unknown_field', offset: 24}
    },
    {
        id: '3',
        timestamp: new Date(Date.now() - 120000),
        level: 'error',
        source: 'UDP Server',
        message: '绑定端口失败',
        details: {port: 9090, error: 'Address already in use'}
    },
    {
        id: '4',
        timestamp: new Date(Date.now() - 180000),
        level: 'debug',
        source: 'Message Handler',
        message: '处理消息',
        details: {messageId: 'msg_001', size: 64}
    }
];

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

export const LogsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState('all');
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [sessionFilter, setSessionFilter] = useState<string | null>(null);
    const [sessionName, setSessionName] = useState<string>('');

    // 解析URL参数来设置会话过滤
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const sessionId = urlParams.get('session');
        const sessionNameParam = urlParams.get('name');

        if (sessionId) {
            setSessionFilter(sessionId);
            setSessionName(decodeURIComponent(sessionNameParam || sessionId));
        }
    }, []);

    const levels = ['info', 'warning', 'error', 'debug'];
    const sources = Array.from(new Set(mockLogs.map(log => log.source)));
    const timeRanges = [
        {value: 'all', label: '全部时间'},
        {value: 'today', label: '今天'},
        {value: '24h', label: '24小时'},
        {value: '7d', label: '7天'},
        {value: '30d', label: '30天'}
    ];

    const filteredLogs = mockLogs.filter(log => {
        const matchesSearch = !searchQuery ||
            log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.source.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesLevel = !selectedLevel || log.level === selectedLevel;
        const matchesSource = !selectedSource || log.source === selectedSource;

        // 会话过滤：如果设置了会话过滤，只显示相关的日志
        const matchesSession = !sessionFilter ||
            log.source.toLowerCase().includes(sessionName.toLowerCase()) ||
            log.message.toLowerCase().includes(sessionFilter.toLowerCase());

        // 简化的时间过滤逻辑
        let matchesTime = true;
        if (selectedTimeRange !== 'all') {
            const now = new Date();
            const logTime = log.timestamp;
            switch (selectedTimeRange) {
                case 'today':
                    matchesTime = logTime.toDateString() === now.toDateString();
                    break;
                case '24h':
                    matchesTime = (now.getTime() - logTime.getTime()) <= 24 * 60 * 60 * 1000;
                    break;
                case '7d':
                    matchesTime = (now.getTime() - logTime.getTime()) <= 7 * 24 * 60 * 60 * 1000;
                    break;
                case '30d':
                    matchesTime = (now.getTime() - logTime.getTime()) <= 30 * 24 * 60 * 60 * 1000;
                    break;
            }
        }

        return matchesSearch && matchesLevel && matchesSource && matchesTime && matchesSession;
    });

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
                                        window.location.hash = '#/logs';
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
                            className="flex items-center space-x-2 px-2.5 py-1.5 border border-border rounded-md hover:bg-accent text-sm">
                            <Download className="w-4 h-4"/>
                            <span>导出</span>
                        </button>
                        <button
                            className="flex items-center space-x-2 px-2.5 py-1.5 border border-border rounded-md hover:bg-accent text-sm">
                            <Trash2 className="w-4 h-4"/>
                            <span>清理</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
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
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">所有级别</option>
                        {levels.map(level => (
                            <option key={level} value={level}>
                                {level.toUpperCase()}
                            </option>
                        ))}
                    </select>

                    {/* Source Filter */}
                    <select
                        value={selectedSource || ''}
                        onChange={(e) => setSelectedSource(e.target.value || null)}
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">所有来源</option>
                        {sources.map(source => (
                            <option key={source} value={source}>
                                {source}
                            </option>
                        ))}
                    </select>

                    {/* Time Range */}
                    <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                <div className="flex-1 overflow-auto">
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
                                            {getLevelIcon(log.level)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-0.5">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium",
                            getLevelColor(log.level)
                        )}>
                          {log.level.toUpperCase()}
                        </span>
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
                    <div className="w-96 border-l border-border bg-card">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold">日志详情</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">时间</label>
                                <p className="font-mono text-sm mt-1">
                                    {formatTimestamp(selectedLog.timestamp)}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">级别</label>
                                <div className="mt-1">
                  <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      getLevelColor(selectedLog.level)
                  )}>
                    {selectedLog.level.toUpperCase()}
                  </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">来源</label>
                                <p className="text-sm mt-1">{selectedLog.source}</p>
                            </div>
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
            <div className="border-t border-border p-2 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>显示 {filteredLogs.length} / {mockLogs.length} 条日志</span>
                    <div className="flex items-center space-x-4">
                        <span>错误: {mockLogs.filter(l => l.level === 'error').length}</span>
                        <span>警告: {mockLogs.filter(l => l.level === 'warning').length}</span>
                        <span>信息: {mockLogs.filter(l => l.level === 'info').length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
