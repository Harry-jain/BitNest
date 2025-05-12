"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getCurrentSession, signOut } from '@/app/lib/supabase';
import Link from 'next/link';
import { getStorageInfo } from '@/app/lib/storage';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{
    totalSpace: number;
    availableSpace: number;
    usedSpace: number;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUserData() {
      try {
        // Check if user is logged in
        const session = await getCurrentSession();

        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Get user details
        const userData = await getCurrentUser();

        if (!userData) {
          await signOut();
          router.push('/auth/login');
          return;
        }

        setUser(userData);

        // Get storage information
        const storage = await getStorageInfo();
        setStorageInfo(storage);
      } catch (error) {
        console.error('Error loading user data:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <span className="text-xl font-bold">BitNest</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Home
            </Link>
            <Link href="/dashboard/files" className="text-sm font-medium hover:text-primary">
              Files
            </Link>
            <Link href="/dashboard/media" className="text-sm font-medium hover:text-primary">
              Media
            </Link>
            <Link href="/dashboard/settings" className="text-sm font-medium hover:text-primary">
              Settings
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-gray-600 hover:text-primary"
            >
              Sign Out
            </button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Welcome, {user?.name || user?.email}</h1>

        {storageInfo && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">Storage</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(storageInfo.usedSpace / storageInfo.totalSpace) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Used: {(storageInfo.usedSpace / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
              <span>Available: {(storageInfo.availableSpace / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
              <span>Total: {(storageInfo.totalSpace / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/files">
            <div className="bg-card p-6 rounded-lg border hover:border-primary transition-colors">
              <h2 className="text-xl font-bold mb-2">Files</h2>
              <p className="text-muted-foreground mb-4">Access and manage your files</p>
              <div className="text-3xl">📁</div>
            </div>
          </Link>
          <Link href="/dashboard/media">
            <div className="bg-card p-6 rounded-lg border hover:border-primary transition-colors">
              <h2 className="text-xl font-bold mb-2">Media</h2>
              <p className="text-muted-foreground mb-4">Stream videos and music</p>
              <div className="text-3xl">🎬</div>
            </div>
          </Link>
          <Link href="/dashboard/upload">
            <div className="bg-card p-6 rounded-lg border hover:border-primary transition-colors">
              <h2 className="text-xl font-bold mb-2">Upload</h2>
              <p className="text-muted-foreground mb-4">Upload new files to your storage</p>
              <div className="text-3xl">⬆️</div>
            </div>
          </Link>
          <Link href="/dashboard/settings">
            <div className="bg-card p-6 rounded-lg border hover:border-primary transition-colors">
              <h2 className="text-xl font-bold mb-2">Settings</h2>
              <p className="text-muted-foreground mb-4">Configure your BitNest</p>
              <div className="text-3xl">⚙️</div>
            </div>
          </Link>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <div className="bg-card p-6 rounded-lg border">
            <p className="text-muted-foreground">No recent activity to display.</p>
          </div>
        </div>
      </main>
    </div>
  );
} 