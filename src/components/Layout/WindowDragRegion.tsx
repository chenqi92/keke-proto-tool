import React from 'react';
import { cn } from '@/utils';
import { usePlatform } from '@/hooks/usePlatform';

interface WindowDragRegionProps {
  className?: string;
  showDebugOutline?: boolean;
}

/**
 * A minimal window drag region positioned at the very top edge of the window.
 * This mimics the behavior of native macOS applications like Finder or Safari,
 * where only a thin strip at the top is draggable.
 */
export const WindowDragRegion: React.FC<WindowDragRegionProps> = ({
  className,
  showDebugOutline = false
}) => {
  const { isMacOS } = usePlatform();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Only render on macOS with overlay title bar style
  if (!isMacOS) {
    return null;
  }

  return (
    <div
      data-tauri-drag-region
      className={cn(
        // Position at the very top of the window
        "fixed top-0 left-0 right-0",
        // High z-index to be above all content but below modals
        "z-40",
        // Minimal height - similar to native macOS apps
        "h-3", // 12px height
        // Enable pointer events for dragging
        "pointer-events-auto",
        // Prevent text selection
        "select-none",
        // Debug outline in development
        isDevelopment && showDebugOutline && "bg-red-500/30 border-b border-red-500",
        className
      )}
      style={{
        // Ensure it's at the very top
        top: 0,
        left: 0,
        right: 0,
        // Minimal height for dragging
        height: '12px',
        // Account for macOS window controls on the left
        marginLeft: '80px', // Space for traffic lights
      }}
      title="Drag to move window"
    />
  );
};

/**
 * Hook to determine if the window drag region should be shown
 */
export const useWindowDragRegion = () => {
  const { isMacOS } = usePlatform();
  
  return {
    shouldShowDragRegion: isMacOS,
    dragRegionHeight: 12, // 12px
  };
};
