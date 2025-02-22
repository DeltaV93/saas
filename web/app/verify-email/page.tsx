'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/utils/apiClient';

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = new URLSearchParams(window.location.search);
  const from = searchParams.get('from');
  const { register, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    apiClient('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationCode: data.verificationCode }),
    })
      .then((response: any) => response.json())
      .then(() => {
        // Handle successful verification
        console.log('Email verified');
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-6">Verify Email</h2>
        {from === 'signup' || from === 'login' ? (
          <p className="text-gray-700">Check your email for a magic link to verify your account.</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded">
            <div className="mb-4">
              <label htmlFor="verificationCode" className="block text-sm text-left font-medium text-gray-700">Verification Code</label>
              <input
                id="verificationCode"
                type="text"
                {...register('verificationCode', { required: true })}
                className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md">Verify Email</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage; 