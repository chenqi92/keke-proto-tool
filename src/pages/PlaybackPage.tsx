import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  FastForward,
  Rewind,
  Volume2,
  Settings,
  FileText,
  Clock,
  Filter
} from 'lucide-react';

interface PlaybackSession {
  id: string;
  name: string;
  duration: number;
  messageCount: number;
  createdAt: Date;
  size: string;
}

const mockSessions: PlaybackSession[] = [
  {
    id: '1',
    name: 'TCP 调试会话 - 2024-01-15',
    duration: 300, // 5 minutes
    messageCount: 1250,
    createdAt: new Date('2024-01-15T10:30:00'),
    size: '2.3 MB'
  },
  {
    id: '2',
    name: 'UDP 通信测试 - 2024-01-14',
    duration: 180, // 3 minutes
    messageCount: 890,
    createdAt: new Date('2024-01-14T15:20:00'),
    size: '1.8 MB'
  },
  {
    id: '3',
    name: '协议解析验证 - 2024-01-13',
    duration: 450, // 7.5 minutes
    messageCount: 2100,
    createdAt: new Date('2024-01-13T09:15:00'),
    size: '4.1 MB'
  }
];

export const PlaybackPage: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<PlaybackSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(50);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const speedOptions = [0.25, 0.5, 1, 1.5, 2, 4];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <h1 className="text-xl font-semibold mb-4">会话回放</h1>
        
        {selectedSession && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">{selectedSession.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedSession.messageCount} 条消息 • {selectedSession.size} • {formatDuration(selectedSession.duration)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-accent rounded-md">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-accent rounded-md">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Session List */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold mb-3">历史会话</h3>
            <input
              type="text"
              placeholder="搜索会话..."
              className="w-full p-2 border border-border rounded-md bg-background text-sm"
            />
          </div>
          
          <div className="flex-1 overflow-auto">
            {mockSessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无历史会话</p>
                <p className="text-sm mt-1">录制的会话将显示在这里</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {mockSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={cn(
                      "w-full p-3 border border-border rounded-lg hover:bg-accent transition-colors text-left",
                      selectedSession?.id === session.id && "border-primary bg-primary/10"
                    )}
                  >
                    <h4 className="font-medium text-sm mb-1 truncate">
                      {session.name}
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>{session.messageCount} 条消息</span>
                        <span>{session.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{formatDuration(session.duration)}</span>
                        <span>{formatDate(session.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Playback Area */}
        <div className="flex-1 flex flex-col">
          {!selectedSession ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">选择会话</h3>
                <p>从左侧选择一个历史会话开始回放</p>
              </div>
            </div>
          ) : (
            <>
              {/* Playback Content */}
              <div className="flex-1 p-4">
                <div className="h-full border border-border rounded-lg bg-muted/30 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">回放视图</h3>
                    <p>会话数据可视化将显示在这里</p>
                    <p className="text-sm mt-2">
                      当前时间: {formatDuration(currentTime)} / {formatDuration(selectedSession.duration)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="border-t border-border p-4 bg-muted/30">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                    <span>{formatDuration(currentTime)}</span>
                    <div className="flex-1 relative">
                      <div className="h-1 bg-muted rounded-full">
                        <div 
                          className="h-1 bg-primary rounded-full transition-all"
                          style={{ 
                            width: `${(currentTime / selectedSession.duration) * 100}%` 
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={selectedSession.duration}
                        value={currentTime}
                        onChange={(e) => handleSeek(Number(e.target.value))}
                        className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span>{formatDuration(selectedSession.duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center space-x-4">
                  <button 
                    className="p-2 hover:bg-accent rounded-md"
                    onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                  >
                    <Rewind className="w-5 h-5" />
                  </button>
                  
                  <button 
                    className="p-2 hover:bg-accent rounded-md"
                    onClick={() => handleSeek(Math.max(0, currentTime - 1))}
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={handlePlay}
                    className="p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>
                  
                  <button 
                    onClick={handleStop}
                    className="p-2 hover:bg-accent rounded-md"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                  
                  <button 
                    className="p-2 hover:bg-accent rounded-md"
                    onClick={() => handleSeek(Math.min(selectedSession.duration, currentTime + 1))}
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                  
                  <button 
                    className="p-2 hover:bg-accent rounded-md"
                    onClick={() => handleSeek(Math.min(selectedSession.duration, currentTime + 10))}
                  >
                    <FastForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Additional Controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-4">
                    {/* Speed Control */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">速度:</span>
                      <select
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        className="px-2 py-1 border border-border rounded bg-background text-sm"
                      >
                        {speedOptions.map(speed => (
                          <option key={speed} value={speed}>
                            {speed}x
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground w-8">
                        {volume}%
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    消息: {Math.floor((currentTime / selectedSession.duration) * selectedSession.messageCount)} / {selectedSession.messageCount}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
