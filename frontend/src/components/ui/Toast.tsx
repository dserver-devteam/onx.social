import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { type Toast as ToastType } from '@/types/toast';

interface ToastProps {
    toast: ToastType;
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, toast.duration || 3000);

        return () => clearTimeout(timer);
    }, [toast, onClose]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'info':
            default:
                return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBorderColor = () => {
        switch (toast.type) {
            case 'success':
                return 'border-green-500/20';
            case 'error':
                return 'border-red-500/20';
            case 'warning':
                return 'border-yellow-500/20';
            case 'info':
            default:
                return 'border-blue-500/20';
        }
    };

    return (
        <div className={`
            flex items-center gap-3 p-4 rounded-xl border bg-gray-900/95 backdrop-blur-md shadow-xl 
            animate-in slide-in-from-bottom-5 fade-in duration-300
            ${getBorderColor()}
            min-w-[300px] max-w-md
        `}>
            {getIcon()}
            <p className="flex-1 text-sm font-medium text-white">{toast.message}</p>
            <button
                onClick={() => onClose(toast.id)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
                <X className="w-4 h-4 text-gray-400" />
            </button>
        </div>
    );
};

export default Toast;
