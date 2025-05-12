"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/supabase';
import Link from 'next/link';
import { getTwoFactorStatus } from '@/app/lib/auth';
import { User } from '@/app/lib/supabase';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadUserData() {
      try {
        // Get user details
        const userData = await getCurrentUser();

        if (!userData) {
          router.push('/auth/login');
          return;
        }

        setUser(userData);

        // Check if 2FA is enabled
        const twoFactorStatus = await getTwoFactorStatus(userData.id);
        setTwoFactorEnabled(twoFactorStatus.isEnabled && twoFactorStatus.isVerified);
      } catch (error) {
        console.error('Error loading user data:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Security Settings */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Security</h2>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/dashboard/settings/password"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>Change Password</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings/two-factor"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <div className="flex items-center">
                    <span>Two-Factor Authentication</span>
                    {twoFactorEnabled && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                        Enabled
                      </span>
                    )}
                  </div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings/devices"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>Connected Devices</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Account Settings */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Account</h2>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/dashboard/settings/profile"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>Profile Information</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings/notifications"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>Notification Preferences</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* System Settings */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">System</h2>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/dashboard/settings/storage"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>Storage Management</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings/theme"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>Theme Preferences</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings/logs"
                  className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>System Logs</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">About BitNest</h2>
        <div className="flex items-center mb-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mr-4">
            BN
          </div>
          <div>
            <h3 className="text-lg font-semibold">BitNest Self-Hosted Cloud</h3>
            <p className="text-gray-600 dark:text-gray-400">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          BitNest is your personal, secure cloud storage and streaming solution, running directly on your Android device.
          All your data stays under your control on your own hardware, with only authentication handled by Supabase.
        </p>
      </div>
    </div>
  );
} 