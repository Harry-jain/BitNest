"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/lib/firebase';

type StorageInfo = {
  total: number;
  used: number;
  available: number;
};

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    total: 128 * 1024 * 1024 * 1024, // 128 GB
    used: 45 * 1024 * 1024 * 1024,   // 45 GB
    available: 83 * 1024 * 1024 * 1024, // 83 GB
  });
  const [updateFrequency, setUpdateFrequency] = useState('weekly');
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [maxStreamingQuality, setMaxStreamingQuality] = useState('720p');
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

  const formatStorage = (bytes: number) => {
    const gigabytes = bytes / (1024 * 1024 * 1024);
    return gigabytes.toFixed(2) + ' GB';
  };

  const calculatePercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to the server
    alert('Settings saved!');
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
            <Link href="/dashboard" className="text-xl font-bold">BitNest</Link>
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
            <Link href="/dashboard/settings" className="text-sm font-medium text-primary">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-bold mb-4">System Settings</h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Update Frequency
                  </label>
                  <select
                    value={updateFrequency}
                    onChange={(e) => setUpdateFrequency(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="manual">Manual</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How often BitNest should check for updates from GitHub
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Compression Level
                  </label>
                  <select
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="low">Low (Faster)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Smaller Files)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher compression saves space but requires more processing power
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Maximum Streaming Quality
                  </label>
                  <select
                    value={maxStreamingQuality}
                    onChange={(e) => setMaxStreamingQuality(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="480p">480p</option>
                    <option value="720p">720p (Recommended)</option>
                    <option value="1080p">1080p (Higher Bandwidth)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher quality needs more bandwidth and processing power
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-bold mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <p className="p-2 border rounded-md bg-muted/20">
                    {user?.email || 'No email found'}
                  </p>
                </div>

                <div>
                  <button 
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                        // Delete logic would go here
                        alert('Account deletion functionality would be implemented here.');
                      }
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-bold mb-4">Storage</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">
                      Used: {formatStorage(storageInfo.used)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {calculatePercentage(storageInfo.used, storageInfo.total)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${calculatePercentage(storageInfo.used, storageInfo.total)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      Available: {formatStorage(storageInfo.available)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Total: {formatStorage(storageInfo.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-bold mb-4">System Health</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Server Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last Update</span>
                  <span className="text-sm text-muted-foreground">
                    7 days ago
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Version</span>
                  <span className="text-sm text-muted-foreground">
                    1.0.0
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Uptime</span>
                  <span className="text-sm text-muted-foreground">
                    15 days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 