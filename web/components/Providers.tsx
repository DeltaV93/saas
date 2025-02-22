'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider } from "@/contexts/AlertContext";
import { ReactNode } from 'react';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AlertProvider>
        {children}
      </AlertProvider>
    </QueryClientProvider>
  );
} 