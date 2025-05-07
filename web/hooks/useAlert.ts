import { useState, useCallback } from 'react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface Alert {
  type: AlertType;
  message: string;
}

export const useAlert = () => {
  const [alert, setAlert] = useState<Alert | null>(null);

  const showAlert = useCallback((type: AlertType, message: string) => {
    setAlert({ type, message });
    // Auto-hide alert after 5 seconds
    setTimeout(() => {
      setAlert(null);
    }, 5000);
  }, []);

  return { alert, showAlert };
}; 