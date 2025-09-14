import React from 'react';
import { cn } from '@/utils';

interface DragRegionProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  showDebugOutline?: boolean;
}

/**
 * A component that creates a draggable region for window dragging in Tauri applications.
 * This component automatically adds the data-tauri-drag-region attribute and appropriate styling.
 */
export const DragRegion: React.FC<DragRegionProps> = ({
  className,
  style,
  children,
  showDebugOutline = false
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <div
      data-tauri-drag-region
      className={cn(
        // Enable pointer events for drag functionality
        "pointer-events-auto",
        // Show debug outline in development mode if requested
        isDevelopment && showDebugOutline && "outline outline-2 outline-red-500 outline-dashed",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};

/**
 * A hook to get common drag region styles for different layouts
 */
export const useDragRegionStyles = () => {
  return {
    // Full width drag region (for simple layouts)
    fullWidth: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
    },
    
    // Center area drag region (excludes left and right button areas)
    centerArea: (leftOffset: number = 200, rightOffset: number = 200) => ({
      position: 'absolute' as const,
      top: 0,
      left: leftOffset,
      right: rightOffset,
      bottom: 0,
      zIndex: -1,
    }),
    
    // Custom clip path drag region
    clipPath: (clipPath: string) => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      clipPath,
      zIndex: -1,
    }),
  };
};
