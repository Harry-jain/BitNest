"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signInWithGoogle, signInWithGithub } from '@/app/lib/supabase';
import { getTwoFactorStatus, verifyTwoFactorToken } from '@/app/lib/auth';
import { logErrorAndNotify } from '@/app/lib/notifications';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null);
  const [show2FAPrompt, setShow2FAPrompt] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [userId, setUserId] = useState('');
  const [tempSession, setTempSession] = useState<any>(null);
  const router = useRouter();

  // Get the redirect URL from query params if available
  const redirectUrl = typeof window !== 'undefined' ?
    new URLSearchParams(window.location.search).get('redirect') || '/dashboard' :
    '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, session, error } = await signIn(email, password);

      if (error) {
        throw new Error(error.message || 'Login failed');
      }

      if (!session) {
        throw new Error('Failed to create session');
      }

      if (!user) {
        throw new Error('User information not available');
      }

      // Check if 2FA is enabled for this user
      const twoFactorStatus = await getTwoFactorStatus(user.id);

      if (twoFactorStatus.isEnabled && twoFactorStatus.isVerified) {
        // Store user ID and session temporarily
        setUserId(user.id);
        setTempSession(session);
        // Show 2FA prompt
        setShow2FAPrompt(true);
        setLoading(false);
        return;
      }

      // No 2FA, proceed with login
      // Login successful, redirect to dashboard
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      // Log error for admin notification
      await logErrorAndNotify(err, 'Login Attempt');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verify the 2FA token
      const isValid = await verifyTwoFactorToken(userId, twoFactorToken);

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // 2FA verified, proceed with login
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Two-factor authentication failed');
      // Log error for admin notification
      await logErrorAndNotify(err, '2FA Verification');
    } finally {
      setLoading(false);
    }
  };

  // Social login handlers
  const handleGoogleSignIn = async () => {
    setOAuthLoading('google');
    setError('');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        throw error;
      }
      // The redirect will be handled by the provider
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setOAuthLoading(null);
    }
  };

  const handleGithubSignIn = async () => {
    setOAuthLoading('github');
    setError('');
    try {
      const { error } = await signInWithGithub();
      if (error) {
        throw error;
      }
      // The redirect will be handled by the provider
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with GitHub');
      setOAuthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to BitNest
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {show2FAPrompt ? (
          <form className="mt-8 space-y-6" onSubmit={handleTwoFactorVerify}>
            <div>
              <label htmlFor="two-factor-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verification Code
              </label>
              <input
                id="two-factor-token"
                name="two-factor-token"
                type="text"
                autoComplete="one-time-code"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 focus:z-10 sm:text-sm"
                placeholder="6-digit verification code"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                onClick={() => setShow2FAPrompt(false)}
              >
                Back to login
              </button>
            </div>
          </form>
        ) : (
          <>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email-address" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    Don&apos;t have an account? Register
                  </Link>
                </div>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={oauthLoading !== null}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                    </g>
                  </svg>
                  {oauthLoading === 'google' ? 'Connecting...' : 'Google'}
                </button>

                <button
                  onClick={handleGithubSignIn}
                  disabled={oauthLoading !== null}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {oauthLoading === 'github' ? 'Connecting...' : 'GitHub'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 