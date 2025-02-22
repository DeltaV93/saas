import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';

const AuthCallbackPage = () => {
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const fetchSession = async () => {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      if (session.user) {
        setUser(session.user);
        router.push('/select-plan');
      } else {
        router.push('/login');
      }
    };

    fetchSession();
  }, [router, setUser]);

  return <div>Loading...</div>;
};

export default AuthCallbackPage; 