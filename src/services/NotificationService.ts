/**
 * Global Notification Service
 * Provides centralized toast and confirm dialog management
 */

import { Toast, ToastType } from '@/components/Common/Toast';

type ToastCallback = (toast: Omit<Toast, 'id'>) => void;
type ConfirmCallback = (options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}) => Promise<boolean>;

class NotificationService {
  private toastCallback: ToastCallback | null = null;
  private confirmCallback: ConfirmCallback | null = null;

  // Register callbacks from the global toast/confirm hooks
  registerToast(callback: ToastCallback) {
    this.toastCallback = callback;
  }

  registerConfirm(callback: ConfirmCallback) {
    this.confirmCallback = callback;
  }

  // Toast methods
  success(title: string, message?: string, options?: Partial<Toast>) {
    if (this.toastCallback) {
      this.toastCallback({ type: 'success', title, message, ...options });
    } else {
      console.warn('[NotificationService] Toast not registered, falling back to alert');
      alert(`✓ ${title}${message ? '\n' + message : ''}`);
    }
  }

  error(title: string, message?: string, options?: Partial<Toast>) {
    if (this.toastCallback) {
      this.toastCallback({ type: 'error', title, message, duration: 8000, ...options });
    } else {
      console.warn('[NotificationService] Toast not registered, falling back to alert');
      alert(`✗ ${title}${message ? '\n' + message : ''}`);
    }
  }

  warning(title: string, message?: string, options?: Partial<Toast>) {
    if (this.toastCallback) {
      this.toastCallback({ type: 'warning', title, message, ...options });
    } else {
      console.warn('[NotificationService] Toast not registered, falling back to alert');
      alert(`⚠ ${title}${message ? '\n' + message : ''}`);
    }
  }

  info(title: string, message?: string, options?: Partial<Toast>) {
    if (this.toastCallback) {
      this.toastCallback({ type: 'info', title, message, ...options });
    } else {
      console.warn('[NotificationService] Toast not registered, falling back to alert');
      alert(`ℹ ${title}${message ? '\n' + message : ''}`);
    }
  }

  // Confirm dialog method
  async confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
  }): Promise<boolean> {
    if (this.confirmCallback) {
      return this.confirmCallback(options);
    } else {
      console.warn('[NotificationService] Confirm dialog not registered, falling back to window.confirm');
      return window.confirm(`${options.title}\n\n${options.message}`);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

