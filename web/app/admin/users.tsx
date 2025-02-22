import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/router';

const AdminUsersPage = () => {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  type User = {
    id: string;
    name: string;
    email: string;
  };

  const usersTyped = users as User[];

  function fetchUsers() {
    // TODO: Implement API call to fetch users
    return fetch('/api/admin/users').then(res => res.json());
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
                {usersTyped.map((user: any) => (
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