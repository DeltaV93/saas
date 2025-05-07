'use client';

import React, { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation'
import { apiClient } from '../../utils/apiClient';
import Link from 'next/link';
import type { GoogleCredentialResponse } from '@/types/google';

interface SignupFormData {
  email: string;
  password: string;
}

interface SignupResponse {
  success: boolean;
  message?: string;
}

interface GoogleSignupResponse {
  statusCode: number;
  message?: string;
}

const SignupPage = () => {
  const { register, handleSubmit } = useForm<SignupFormData>();
  const router = useRouter();

  const handleGoogleCallback = useCallback((response: GoogleCredentialResponse) => {
    const token = response.credential;
    apiClient('/auth/google-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (response instanceof Response) {
          const data = await response.json();
          return data as GoogleSignupResponse;
        }
        return response as GoogleSignupResponse;
      })
      .then((data) => {
        if (data.statusCode <= 200) {
          router.push('/select-plan');
        }
      });
  }, [router]);

  useEffect(() => {
    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      // Initialize Google Sign-In
      if (window.google?.accounts?.id) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
          console.error('Google Client ID is not defined');
          return;
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
        });
        const buttonElement = document.getElementById('google-signin-button');
        if (buttonElement) {
          window.google.accounts.id.renderButton(
            buttonElement,
            { theme: 'outline', size: 'large' }
          );
        }
      }
    };
    return () => {
      document.body.removeChild(script);
    };
  }, [handleGoogleCallback]);

  const onSubmit = (data: SignupFormData) => {
    apiClient('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password }),
    })
      .then(async (response) => {
        if (response instanceof Response) {
          const data = await response.json();
          return data as SignupResponse;
        }
        return response as SignupResponse;
      })
      .then(() => {
        router.push('/verify-email?from=signup');
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            {...register('email', { required: true })}
            className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            aria-required="true"
            aria-label="Email"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            {...register('password', { required: true })}
            className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            aria-required="true"
            aria-label="Password"
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md">Sign Up</button>
        <div className="mt-4 text-center">
          <div id="google-signin-button" className="w-full mt-2"></div>
        </div>
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-indigo-600 hover:underline">
            Already have an account? Login now
          </Link>
        </div>
      </form>
    </div>
  );
};

export default SignupPage; 