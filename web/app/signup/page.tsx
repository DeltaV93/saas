'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation'
import { apiClient } from '../../utils/apiClient';
import Link from 'next/link';

const SignupPage = () => {
  const { register, handleSubmit } = useForm();
  const router = useRouter();

  useEffect(() => {
    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large' }
      );
    };
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const onSubmit = (data: any) => {
    apiClient('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password }),
    })
      .then((response: any) => response.json())
      .then(() => {
        router.push('/verify-email?from=signup');
      });
  };

  const handleGoogleCallback = (response: any) => {
    const token = response.credential;
    apiClient('/auth/google-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((response: any) => response.json())
      .then((data) => {
        if (data.statusCode <= 200) {
          router.push('/select-plan');
        }
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