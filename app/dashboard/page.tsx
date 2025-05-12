"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/lib/firebase';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

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
              onClick={() => auth.signOut()}
              className="text-sm font-medium text-gray-600 hover:text-primary"
            >
              Sign Out
            </button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Welcome, {user?.displayName || user?.email}</h1>

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