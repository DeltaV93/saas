'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../utils/apiClient';

const DashboardPage = () => {
  const { user, logout, setUser } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['userData'],
    queryFn: fetchUserData,
  });

  useEffect(() => {
    if (!user) {
      apiClient('/auth/me').then((response: any) => response.json()).then((data) => {
        if (data) {
          setUser(data);
        }
      });
    }
  }, [user, setUser]);

  function fetchUserData() {
    console.log('fetching user data');
    return apiClient('/api/user').then((response: any) => response.json());
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md max-w-sm w-full text-center">
        <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
        <p className="text-gray-700">Please log in to access the dashboard.</p>
      </div>
    </div>
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="rounded-lg h-96">
              <h1 className="text-3xl font-bold mb-4">Welcome, {user.name}</h1>
              <button onClick={logout} className="bg-red-500 text-white py-2 px-4 rounded-md">Logout</button>
              <div className="mt-6">
                <h2 className="text-2xl mb-2">Your Data</h2>
                <pre className="bg-white p-4 rounded-md shadow-md">{JSON.stringify(data, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage; 