import React, { createContext, useContext, useState, useCallback } from 'react';
import AlertModal, { AlertType } from '../components/AlertModal';

interface AlertOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: AlertType;
}

interface AlertContextType {
  showAlert: (message: string, options?: AlertOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    type: AlertType;
    confirmText: string;
    cancelText: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showAlert = useCallback((message: string, options: AlertOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setAlertState({
        isOpen: true,
        message,
        title: options.title || (options.type === 'confirm' ? 'Konfirmasi' : 'Informasi'),
        type: options.type || 'info',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Batal',
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (alertState) {
      alertState.resolve(true);
      setAlertState(null);
    }
  };

  const handleCancel = () => {
    if (alertState) {
      alertState.resolve(false);
      setAlertState(null);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alertState && (
        <AlertModal
          isOpen={alertState.isOpen}
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmText={alertState.confirmText}
          cancelText={alertState.cancelText}
        />
      )}
    </AlertContext.Provider>
  );
};
