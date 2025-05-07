'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/utils/apiClient';
import { useRouter } from 'next/navigation';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

const ForgotPasswordPage = () => {
  const { register, handleSubmit } = useForm<ForgotPasswordFormData>();
  const router = useRouter();

  const onSubmit = (data: ForgotPasswordFormData) => {
    apiClient('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    })
      .then(async (response) => {
        if (response instanceof Response) {
          const data = await response.json();
          return data as ForgotPasswordResponse;
        }
        return response as ForgotPasswordResponse;
      })
      .then((result: ForgotPasswordResponse) => {
        if (result.success) {
          router.push('/verify-email?from=login');
          console.log('Password reset link sent successfully');
        } else {
          console.error('Failed to send password reset link');
        }
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Forgot Password</h2>
        <div className="mb-4">
          <label htmlFor="email" className="block  text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            {...register('email', { required: true })}
            className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md">Send Reset Link</button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage; 