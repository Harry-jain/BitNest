'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/app/lib/supabase';

export default function Logout() {
    const router = useRouter();

    useEffect(() => {
        const performLogout = async () => {
            try {
                const { error } = await signOut();
                if (error) {
                    console.error('Error signing out:', error);
                }
            } catch (error) {
                console.error('Unexpected error during logout:', error);
            } finally {
                // Redirect to login page regardless of success/failure
                router.push('/auth/login');
            }
        };

        performLogout();
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Signing Out</h1>
                <p className="text-gray-600 mb-4">Please wait while we sign you out...</p>
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            </div>
        </div>
    );
} 