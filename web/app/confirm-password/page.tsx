'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/utils/apiClient';

interface PasswordFormData {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}

const ConfirmPasswordContent = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PasswordFormData>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (searchParams) {
      setToken(searchParams.get('token'));
    }
  }, [searchParams]);

  const passwordRequirements = [
    { id: 1, text: 'At least 8 characters long' },
    { id: 2, text: 'Contains at least one uppercase letter' },
    { id: 3, text: 'Contains at least one lowercase letter' },
    { id: 4, text: 'Contains at least one number' },
    { id: 5, text: 'Contains at least one special character' },
  ];

  const onSubmit = (data: PasswordFormData) => {
    if (!token) {
      console.error('Reset token is missing');
      return;
    }

    apiClient('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        password: data.password,
        token: token 
      }),
    })
      .then(async (response) => {
        if (response instanceof Response) {
          const data = await response.json();
          return data as ResetPasswordResponse;
        }
        return response as ResetPasswordResponse;
      })
      .then((result) => {
        if (result.success) {
          router.push('/login');
          console.log('Password reset successfully');
        } else {
          console.error('Failed to reset password');
        }
      })
      .catch((error) => {
        console.error('Error resetting password:', error);
      });
  };

  const validatePassword = (value: string) => {
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(value)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(value)) return "Password must contain a number";
    if (!/[!@#$%^&*]/.test(value)) return "Password must contain a special character";
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Create New Password</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register('password', { 
                  required: "Password is required",
                  validate: validatePassword
                })}
                className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                aria-describedby="password-requirements"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...register('confirmPassword', {
                  required: "Please confirm your password",
                  validate: (value) => value === watch('password') || "Passwords do not match"
                })}
                className="px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h3>
            <ul className="space-y-1" id="password-requirements">
              {passwordRequirements.map((req) => (
                <li key={req.id} className="text-sm text-gray-600 flex items-center">
                  <span className="mr-2">•</span>
                  {req.text}
                </li>
              ))}
            </ul>
          </div>

          <button 
            type="submit" 
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

const ConfirmPasswordPage = () => {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>}>
      <ConfirmPasswordContent />
    </Suspense>
  );
};

export default ConfirmPasswordPage; 