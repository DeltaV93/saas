import React, { useEffect, ComponentType } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/navigation';

interface ComponentProps {
  [key: string]: unknown;
}

const withRoleProtection = <P extends ComponentProps>(
  Component: ComponentType<P>, 
  requiredRole: string
) => {
  const ProtectedComponent = (props: P) => {
    const { user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
      if (!user || user.role !== requiredRole) {
        router.push('/dashboard');
      }
    }, [user, router]);

    if (!user || user.role !== requiredRole) {
      return null;
    }

    return <Component {...props} />;
  };

  // Set the display name
  ProtectedComponent.displayName = `withRoleProtection(${
    Component.displayName || Component.name || 'Component'
  })`;

  return ProtectedComponent;
};

export default withRoleProtection;