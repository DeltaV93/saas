import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { apiClient } from '../utils/apiClient';

interface PasswordFormData {
  password: string;
  confirmPassword: string;
}

interface PasswordRequirement {
  id: string;
  label: string;
  validator: (value: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  {
    id: 'length',
    label: 'At least 8 characters long',
    validator: (value) => value.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Contains at least one uppercase letter',
    validator: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    label: 'Contains at least one lowercase letter',
    validator: (value) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: 'Contains at least one number',
    validator: (value) => /\d/.test(value),
  },
  {
    id: 'special',
    label: 'Contains at least one special character',
    validator: (value) => /[!@#$%^&*]/.test(value),
  },
];

export const ConfirmNewPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requirements, setRequirements] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { token } = router.query;

  const { register, handleSubmit, watch, formState: { errors }, setError } = useForm<PasswordFormData>();
  const password = watch('password', '');

  const validatePasswordRequirements = useCallback((value: string) => {
    const newRequirements = passwordRequirements.reduce((acc, requirement) => ({
      ...acc,
      [requirement.id]: requirement.validator(value),
    }), {});

    setRequirements(newRequirements);
    return Object.values(newRequirements).every(Boolean);
  }, []);

  const onSubmit = async (data: PasswordFormData) => {
    if (!validatePasswordRequirements(data.password)) {
      setError('password', {
        type: 'manual',
        message: 'Password does not meet all requirements',
      });
      return;
    }

    try {
      const response = await apiClient('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password: data.password,
          token 
        }),
      });
      
      if (response.ok) {
        router.push('/login?message=password-reset-success');
      } else {
        throw new Error('Password reset failed');
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: 'Failed to reset password. Please try again.',
      });
    }
  };

  const PasswordInput = ({ 
    id, 
    label, 
    show, 
    toggle, 
    registration, 
    error 
  }: {
    id: string;
    label: string;
    show: boolean;
    toggle: () => void;
    registration: any;
    error?: string;
  }) => (
    <div className="relative mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={`px-3 py-2 w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          {...registration}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={`${id}-error ${id}-requirements`}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <EyeIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900">
            Create New Password
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <PasswordInput
            id="password"
            label="New Password"
            show={showPassword}
            toggle={() => setShowPassword(!showPassword)}
            registration={register('password', {
              required: 'Password is required',
              onChange: (e) => validatePasswordRequirements(e.target.value),
            })}
            error={errors.password?.message}
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm Password"
            show={showConfirmPassword}
            toggle={() => setShowConfirmPassword(!showConfirmPassword)}
            registration={register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === password || 'Passwords do not match',
            })}
            error={errors.confirmPassword?.message}
          />

          <div 
            className="bg-gray-50 p-4 rounded-md space-y-2"
            aria-label="Password requirements"
            id="password-requirements"
          >
            <h3 className="text-sm font-medium text-gray-700">Password must have:</h3>
            <ul className="space-y-1">
              {passwordRequirements.map((req) => (
                <li
                  key={req.id}
                  className={`text-sm flex items-center ${
                    requirements[req.id] ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  <span className="mr-2">{requirements[req.id] ? '✓' : '○'}</span>
                  {req.label}
                </li>
              ))}
            </ul>
          </div>

          {errors.root && (
            <div className="text-red-600 text-sm text-center">
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConfirmNewPassword; 