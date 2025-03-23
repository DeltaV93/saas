'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
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
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const { register, handleSubmit, setValue } = useForm();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      // Prepopulate form fields with user data
      setValue('name', user?.name);
      setValue('email', user?.email);
    }
  }, [user, router, setValue]);

  const updateProfile = useMutation({
    mutationFn: (data: any) => apiClient('/auth/update-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((response: any) => response.json()),
    onSuccess: (updatedUser) => {
      console.log('Profile updated successfully');
      setUser(updatedUser.data); // Update the user in the store
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
    }
  });

  const changePassword = useMutation({
    mutationFn: (data: any) => apiClient('/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((response: any) => response.json()),
    onSuccess: () => {
      console.log('Password changed successfully');
    },
    onError: (error) => {
      console.error('Failed to change password:', error);
    }
  });

  const onSubmitProfile = (data: any) => {
    console.log('onSubmitProfile', data);
    updateProfile.mutate(data);
  };

  const onSubmitPassword = (data: any) => {
    changePassword.mutate(data);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">{user?.name} | Profile Settings</h2>
        <form onSubmit={handleSubmit(onSubmitProfile)} className="mb-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              id="name"
              type="text"
              {...register('name', { required: true })}
              className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
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
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Updating...' : 'Update Profile'}
          </button>
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
          <button 
            type="submit" 
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage; 