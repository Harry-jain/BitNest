"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/supabase';
import {
    generateTwoFactorSecret,
    verifyTwoFactorToken,
    getTwoFactorStatus,
    disableTwoFactor,
    TwoFactorStatus,
} from '@/app/lib/auth';
import Link from 'next/link';

export default function TwoFactorAuthPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<TwoFactorStatus>({
        isEnabled: false,
        isVerified: false,
    });
    const [showQrCode, setShowQrCode] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [setupStep, setSetupStep] = useState(0);
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

                // Get 2FA status
                const twoFactorStatus = await getTwoFactorStatus(userData.id);
                setStatus(twoFactorStatus);

                if (twoFactorStatus.isEnabled && !twoFactorStatus.isVerified) {
                    setSetupStep(1);
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                router.push('/auth/login');
            } finally {
                setLoading(false);
            }
        }

        loadUserData();
    }, [router]);

    const handleSetup2FA = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (!user) {
                throw new Error('User not found');
            }

            // Generate new 2FA secret
            const { secret, qrCodeUrl } = await generateTwoFactorSecret(user);
            setQrCodeUrl(qrCodeUrl);
            setShowQrCode(true);
            setSetupStep(1);
        } catch (error: any) {
            setError(error.message || 'Failed to set up two-factor authentication');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (!user) {
                throw new Error('User not found');
            }

            // Verify the code
            const isValid = await verifyTwoFactorToken(user.id, verificationCode);

            if (isValid) {
                setSuccess('Two-factor authentication enabled successfully!');
                setStatus({
                    isEnabled: true,
                    isVerified: true,
                });
                setSetupStep(2);
            } else {
                throw new Error('Invalid verification code. Please try again.');
            }
        } catch (error: any) {
            setError(error.message || 'Failed to verify code');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (!user) {
                throw new Error('User not found');
            }

            // Disable 2FA
            const result = await disableTwoFactor(user.id);

            if (result) {
                setSuccess('Two-factor authentication disabled successfully.');
                setStatus({
                    isEnabled: false,
                    isVerified: false,
                });
                setSetupStep(0);
                setShowQrCode(false);
            } else {
                throw new Error('Failed to disable two-factor authentication');
            }
        } catch (error: any) {
            setError(error.message || 'Failed to disable two-factor authentication');
        } finally {
            setLoading(false);
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
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="flex items-center mb-8">
                <Link
                    href="/dashboard/settings"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 mr-4"
                >
                    ← Back to Settings
                </Link>
                <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                {error && (
                    <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 mb-4 bg-green-100 text-green-700 rounded-md text-sm">
                        {success}
                    </div>
                )}

                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">
                        Status: {status.isEnabled && status.isVerified
                            ? 'Enabled'
                            : status.isEnabled && !status.isVerified
                                ? 'Setup in progress'
                                : 'Disabled'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Two-factor authentication adds an extra layer of security to your account by requiring
                        a verification code from your phone in addition to your password.
                    </p>
                </div>

                {setupStep === 0 && !status.isEnabled && (
                    <button
                        onClick={handleSetup2FA}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Setting up...' : 'Set up two-factor authentication'}
                    </button>
                )}

                {setupStep === 1 && showQrCode && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium mb-2">Step 1: Scan the QR Code</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
                            </p>
                            <div className="bg-white p-4 inline-block rounded">
                                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code for 2FA" className="max-w-full h-auto" />}
                            </div>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-4">
                            <div>
                                <h3 className="text-lg font-medium mb-2">Step 2: Enter Verification Code</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Enter the 6-digit code from your authenticator app to verify setup.
                                </p>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="6-digit code"
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 text-gray-900 dark:text-white w-full max-w-xs"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify and enable'}
                            </button>
                        </form>
                    </div>
                )}

                {(setupStep === 2 || (status.isEnabled && status.isVerified)) && (
                    <div className="space-y-6">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded">
                            <h3 className="text-lg font-medium text-green-800 dark:text-green-400 mb-2">
                                Two-factor authentication is enabled
                            </h3>
                            <p className="text-green-700 dark:text-green-300">
                                Your account is now protected with two-factor authentication. You'll need to enter a verification code
                                from your authenticator app each time you sign in.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-2">Disable Two-Factor Authentication</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Warning: This will remove the extra layer of security from your account.
                            </p>
                            <button
                                onClick={handleDisable2FA}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {loading ? 'Disabling...' : 'Disable two-factor authentication'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 