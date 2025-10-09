import { create } from 'zustand';

export type ModalType = 'protocol-editor' | 'toolbox' | 'plugins' | 'logs' | 'storage';

export interface MinimizedModal {
  id: ModalType;
  title: string;
  icon: string;
  state: any; // 保存弹框的状态数据
}

interface MinimizedModalsState {
  minimizedModals: Map<ModalType, MinimizedModal>;
  
  // 最小化一个弹框
  minimizeModal: (modal: MinimizedModal) => void;
  
  // 恢复一个弹框
  restoreModal: (id: ModalType) => MinimizedModal | undefined;
  
  // 检查弹框是否被最小化
  isMinimized: (id: ModalType) => boolean;
  
  // 获取所有最小化的弹框
  getAllMinimized: () => MinimizedModal[];
  
  // 清除指定弹框的最小化状态（用于关闭）
  clearMinimized: (id: ModalType) => void;
}

export const useMinimizedModalsStore = create<MinimizedModalsState>((set, get) => ({
  minimizedModals: new Map(),
  
  minimizeModal: (modal) => {
    set((state) => {
      const newMap = new Map(state.minimizedModals);
      newMap.set(modal.id, modal);
      return { minimizedModals: newMap };
    });
  },
  
  restoreModal: (id) => {
    const modal = get().minimizedModals.get(id);
    if (modal) {
      set((state) => {
        const newMap = new Map(state.minimizedModals);
        newMap.delete(id);
        return { minimizedModals: newMap };
      });
    }
    return modal;
  },
  
  isMinimized: (id) => {
    return get().minimizedModals.has(id);
  },
  
  getAllMinimized: () => {
    return Array.from(get().minimizedModals.values());
  },
  
  clearMinimized: (id) => {
    set((state) => {
      const newMap = new Map(state.minimizedModals);
      newMap.delete(id);
      return { minimizedModals: newMap };
    });
  }
}));

