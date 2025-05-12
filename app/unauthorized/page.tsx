'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Unauthorized() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="max-w-md w-full p-10 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center">
                <div className="text-red-500 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    You do not have permission to access this resource. BitNest protects user data by restricting access to authorized users only.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => router.back()}
                        className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200"
                    >
                        Go Back
                    </button>

                    <Link href="/dashboard" className="block w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
} 