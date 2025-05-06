'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  name: string;
  email: string;
};

const fetchUsers = async (): Promise<User[]> => {
  // Implement API call to fetch users
  const response = await fetch('/api/admin/users');
  return response.json();
};

const AdminUsersPage = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  
  // Always call useQuery, regardless of user state, to satisfy the Rules of Hooks
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    // Don't actually fetch if user isn't admin
    enabled: !!user && user.role === 'admin'
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Return early if user isn't an admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="rounded-lg h-96 bg-white p-4 shadow-md">
              <h2 className="text-2xl font-bold mb-4">Users</h2>
              <ul>
                {users.map((user) => (
                  <li key={user.id} className="mb-2">
                    {user.name} - {user.email}
                    {/* TODO: Add actions for managing users */}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminUsersPage;