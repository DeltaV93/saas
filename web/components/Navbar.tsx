'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../utils/apiClient';
import { useRouter } from 'next/navigation';

interface LogoutResponse {
  success: boolean;
  message?: string;
}

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await apiClient('/auth/logout', {
        method: 'POST',
      });
      
      if (response instanceof Response) {
        const result = await response.json() as LogoutResponse;
        if (result.success) {
          logout();
          console.log('User logged out successfully');
          router.push('/login');
        } else {
          console.error('Logout failed:', result.message);
        }
      } else {
        const result = response as LogoutResponse;
        if (result.success) {
          logout();
          console.log('User logged out successfully');
          router.push('/login');
        } else {
          console.error('Logout failed:', result.message);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent default button behavior
      toggleDropdown();
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <img className="h-8 w-auto" src="/next.svg" alt="App Logo" />
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/dashboard" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium">
                Dashboard
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="relative">
                <button onClick={toggleDropdown} onKeyDown={handleKeyDown} className="flex items-center text-gray-900" aria-haspopup="true" aria-expanded={isDropdownOpen} aria-label="User menu">
                  <img className="h-8 w-8 rounded-full" src={user.profilePicture || '/profile-icon.svg'} alt="Profile" />
                  <svg className="ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                    <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Profile</Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/signup" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium">
                  Sign Up
                </Link>
                <Link href="/login" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 