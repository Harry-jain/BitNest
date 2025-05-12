'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, User } from '../lib/supabase';
import AdminDashboard from '../components/admin/Dashboard';
import { redirect } from 'next/navigation';

export default function AdminPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function checkUser() {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
                setIsAdmin(currentUser?.role === 'admin');
            } catch (error) {
                console.error('Error checking user:', error);
            } finally {
                setLoading(false);
            }
        }

        checkUser();
    }, []);

    // If not logged in, redirect to login
    if (!loading && !user) {
        redirect('/login?redirect=/admin');
        return null;
    }

    // If not an admin, show access denied
    if (!loading && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
                    <h2 className="text-lg font-bold">Access Denied</h2>
                    <p>You do not have permission to access the admin area.</p>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                >
                    Return to Homepage
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <p className="text-xl mb-2">Loading Admin Panel</p>
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">BitNest Admin</h1>
                    <div className="flex items-center">
                        <span className="mr-4 text-sm text-gray-600 dark:text-gray-300">
                            Signed in as {user?.name} ({user?.role})
                        </span>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                        >
                            Back to App
                        </button>
                    </div>
                </div>
            </header>

            <main>
                <AdminDashboard />
            </main>
        </div>
    );
}