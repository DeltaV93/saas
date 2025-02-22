'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type AlertType = 'success' | 'error';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

interface AlertContextType {
  alerts: Alert[];
  showAlert: (message: string, type: AlertType) => void;
  removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
  }, []);

  const showAlert = useCallback((message: string, type: AlertType) => {
    const id = uuidv4();
    const newAlert: Alert = { id, type, message };
    
    setAlerts((prevAlerts) => [...prevAlerts, newAlert]);

    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      removeAlert(id);
    }, 5000);
  }, [removeAlert]);

  return (
    <AlertContext.Provider value={{ alerts, showAlert, removeAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}; 