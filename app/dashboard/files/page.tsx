"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/lib/firebase';

type FileItem = {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: string;
  path: string;
};

// Mock data for demonstration
const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'report.pdf',
    type: 'pdf',
    size: 2500000,
    lastModified: '2023-12-01T10:00:00',
    path: '/docs/report.pdf',
  },
  {
    id: '2',
    name: 'vacation.jpg',
    type: 'image',
    size: 1500000,
    lastModified: '2023-11-25T15:30:00',
    path: '/photos/vacation.jpg',
  },
  {
    id: '3',
    name: 'presentation.pptx',
    type: 'document',
    size: 5000000,
    lastModified: '2023-12-05T08:45:00',
    path: '/work/presentation.pptx',
  },
  {
    id: '4',
    name: 'notes.txt',
    type: 'text',
    size: 10000,
    lastModified: '2023-12-10T16:20:00',
    path: '/personal/notes.txt',
  },
];

export default function Files() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        // In a real implementation, we would fetch files from the server
        setFiles(mockFiles);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'image':
        return '🖼️';
      case 'document':
        return '📝';
      case 'text':
        return '📃';
      default:
        return '📁';
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
            <Link href="/dashboard" className="text-xl font-bold">BitNest</Link>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Home
            </Link>
            <Link href="/dashboard/files" className="text-sm font-medium text-primary">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Files</h1>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Upload
          </button>
        </div>

        <div className="bg-card rounded-lg border mb-8">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Path:</span>
              <span className="font-medium">{currentPath}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Size</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Modified</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      No files found in this directory.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 flex items-center">
                        <span className="mr-2">{getFileIcon(file.type)}</span>
                        <span>{file.name}</span>
                      </td>
                      <td className="px-4 py-3 capitalize">{file.type}</td>
                      <td className="px-4 py-3">{formatFileSize(file.size)}</td>
                      <td className="px-4 py-3">
                        {new Date(file.lastModified).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button className="text-blue-500 hover:text-blue-700">
                            Download
                          </button>
                          <button className="text-red-500 hover:text-red-700">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
} 