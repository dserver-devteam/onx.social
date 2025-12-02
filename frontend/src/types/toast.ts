export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

export interface ToastContextType {
    showToast: (message: string, type: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}
