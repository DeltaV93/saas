'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, setAuthToken } from '@/utils/apiClient';
import { useAuthStore } from '@/store/authStore';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
  statusCode?: number;
  access_token?: string;
}

const LoginPage: React.FC = () => {
  const { register, handleSubmit } = useForm<LoginFormData>();
  const router = useRouter();
  const { setUser } = useAuthStore();

  const onSubmit = (data: LoginFormData) => {
    apiClient('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(async (response) => {
        if (response instanceof Response) {
          const data = await response.json();
          return data as LoginResponse;
        }
        return response as LoginResponse;
      })
      .then((result) => {
        if (result.success || (result.statusCode && result.statusCode <= 200)) {
          console.log('Login successful');
          
          // Store the JWT token
          if (result.token) {
            setAuthToken(result.token);
          } else if (result.access_token) {
            setAuthToken(result.access_token);
          }
          
          // Fetch user data after successful login
          apiClient('/auth/me')
            .then(async (response) => {
              if (response instanceof Response) {
                return await response.json();
              }
              return response;
            })
            .then((userData) => {
              if (userData && userData.data) {
                setUser(userData.data);
              }
              // Redirect to dashboard
              router.push('/dashboard');
            })
            .catch(err => {
              console.error('Failed to fetch user data:', err);
              router.push('/dashboard');
            });
        } else {
          console.error('Login failed');
        }
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            {...register('email', { required: true })}
            className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            {...register('password', { required: true })}
            className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md">Login</button>
        <div className="mt-4">
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md">Login with Google</button>
        </div>
        <div className="mt-4">
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md">Send Magic Link</button>
        </div>
        <div className="mt-4 text-center">
          <a href="/forgot-password" className="text-sm text-indigo-600 hover:underline">
            Forgot Password?
          </a>
        </div>
      </form>
    </div>
  );
};

export default LoginPage; 