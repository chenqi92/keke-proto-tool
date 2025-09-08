import { useState, useEffect } from 'react';

export interface BreakpointConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  breakpoint: 'sm' | 'md' | 'lg' | 'xl';
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const useResponsive = (breakpoints: BreakpointConfig = defaultBreakpoints): ResponsiveState => {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    
    // 初始化时获取一次尺寸
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width, height } = windowSize;

  // 确定当前断点
  let breakpoint: 'sm' | 'md' | 'lg' | 'xl' = 'sm';
  if (width >= breakpoints.xl) {
    breakpoint = 'xl';
  } else if (width >= breakpoints.lg) {
    breakpoint = 'lg';
  } else if (width >= breakpoints.md) {
    breakpoint = 'md';
  }

  return {
    width,
    height,
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
    isLargeDesktop: width >= breakpoints.xl,
    breakpoint,
  };
};

// 布局配置Hook
export const useLayoutConfig = () => {
  const responsive = useResponsive();

  return {
    ...responsive,
    // 侧边栏配置
    sidebar: {
      shouldCollapse: responsive.isMobile,
      width: responsive.isMobile ? '100%' : responsive.isTablet ? '280px' : '320px',
      canResize: !responsive.isMobile,
    },
    // 主内容区配置
    mainContent: {
      showThreeColumns: responsive.isDesktop || responsive.isLargeDesktop,
      showTwoColumns: responsive.isTablet,
      showOneColumn: responsive.isMobile,
    },
    // 工具栏配置
    toolbar: {
      showAllButtons: responsive.isDesktop || responsive.isLargeDesktop,
      showEssentialButtons: responsive.isTablet,
      showMinimalButtons: responsive.isMobile,
    },
    // 状态栏配置
    statusBar: {
      showAllInfo: responsive.isDesktop || responsive.isLargeDesktop,
      showEssentialInfo: responsive.isTablet,
      showMinimalInfo: responsive.isMobile,
    },
  };
};
