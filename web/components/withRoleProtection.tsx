import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/router';

const withRoleProtection = (Component: React.ComponentType, requiredRole: string) => {
  return (props: any) => {
    const { user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
      if (!user || user.role !== requiredRole) {
        router.push('/dashboard');
      }
    }, [user, router, requiredRole]);

    if (!user || user.role !== requiredRole) {
      return null;
    }

    return <Component {...props} />;
  };
};

export default withRoleProtection; 