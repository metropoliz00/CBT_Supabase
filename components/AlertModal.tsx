import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertModalProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Batal',
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-emerald-500" size={48} />;
      case 'error':
        return <XCircle className="text-red-500" size={48} />;
      case 'warning':
      case 'confirm':
        return <AlertCircle className="text-amber-500" size={48} />;
      case 'info':
      default:
        return <Info className="text-blue-500" size={48} />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'success': return 'bg-emerald-50';
      case 'error': return 'bg-red-50';
      case 'warning':
      case 'confirm': return 'bg-amber-50';
      case 'info':
      default: return 'bg-blue-50';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className={`p-6 flex flex-col items-center text-center ${getHeaderColor()}`}>
          <div className="mb-4 bg-white p-3 rounded-full shadow-sm">
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-center leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                type === 'error' 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200' 
                  : type === 'warning' || type === 'confirm'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {confirmText}
            </button>
            {type === 'confirm' && onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors active:scale-95"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
