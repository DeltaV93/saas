'use client';

import { FC } from 'react';
import { Alert } from './Alert';
import { useAlerts } from '@/contexts/AlertContext';

export const AlertContainer: FC = () => {
  const { alerts, removeAlert } = useAlerts();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.type}
          onClose={() => removeAlert(alert.id)}
        >
          {alert.message}
        </Alert>
      ))}
    </div>
  );
}; 