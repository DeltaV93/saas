'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/utils/apiClient';

/**
 * ProfilePage component handles user profile management including:
 * - Displaying and updating user profile information
 * - Changing password
 * - Protected route (redirects to login if not authenticated)
 */
const ProfilePage = () => {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const { register, handleSubmit } = useForm();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => apiClient('/user/profile').then((response: any) => response.json()),
  });
  const updateProfile = useMutation({
    mutationFn: (data: any) => apiClient('/user/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((response: any) => response.json()),
  });
  const changePassword = useMutation({
    mutationFn: (data: any) => apiClient('/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((response: any) => response.json()),
  });

  type ProfileData = {
    name: string;
    email: string;
  };

  const profileDataTyped = profileData as ProfileData;

  const onSubmitProfile = (data: any) => {
    updateProfile.mutate(data);
  };

  const onSubmitPassword = (data: any) => {
    changePassword.mutate(data);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Profile Settings</h2>
        <form onSubmit={handleSubmit(onSubmitProfile)} className="mb-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              id="name"
              type="text"
              defaultValue={profileDataTyped?.name}
              {...register('name', { required: true })}
              className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              defaultValue={profileDataTyped?.email}
              {...register('email', { required: true })}
              className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700">Profile Picture</label>
            <input
              id="profilePicture"
              type="file"
              {...register('profilePicture')}
              className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md">Update Profile</button>
        </form>
        <form onSubmit={handleSubmit(onSubmitPassword)}>
          <h3 className="text-xl font-bold mb-4">Change Password</h3>
          <div className="mb-4">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              {...register('currentPassword', { required: true })}
              className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              id="newPassword"
              type="password"
              {...register('newPassword', { required: true })}
              className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md">Change Password</button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage; 