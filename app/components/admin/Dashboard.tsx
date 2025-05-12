"use client";

import React, { useState, useEffect } from 'react';
import {
    getSystemStats,
    updateSystemConfig,
    updateUserQuota,
    SystemConfig,
    User
} from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [stats, setStats] = useState<{
        userCount: number;
        activeUsers: number;
        totalStorage: number;
        availableStorage: number;
    }>({
        userCount: 0,
        activeUsers: 0,
        totalStorage: 0,
        availableStorage: 0
    });

    // For form inputs
    const [maxUsers, setMaxUsers] = useState(10);
    const [defaultQuota, setDefaultQuota] = useState(10);
    const [totalLimit, setTotalLimit] = useState(100);
    const [selectedUser, setSelectedUser] = useState('');
    const [userQuota, setUserQuota] = useState(10);
    const [message, setMessage] = useState('');

    // Format bytes to human-readable size
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Convert GB to bytes
    const gbToBytes = (gb: number) => gb * 1024 * 1024 * 1024;

    // Convert bytes to GB
    const bytesToGb = (bytes: number) => bytes / (1024 * 1024 * 1024);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch stats
                const statsData = await getSystemStats();
                if (!statsData.error) {
                    setStats(statsData);
                }

                // Fetch system config
                const { data: configData, error: configError } = await supabase
                    .from('system_config')
                    .select('*')
                    .eq('id', 'default')
                    .single();

                if (!configError && configData) {
                    setSystemConfig(configData as SystemConfig);
                    setMaxUsers(configData.max_users);
                    setDefaultQuota(bytesToGb(configData.default_user_quota));
                    setTotalLimit(bytesToGb(configData.total_storage_limit));
                }

                // Fetch users
                const { data: userData, error: userError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!userError && userData) {
                    setUsers(userData as User[]);
                    if (userData.length > 0) {
                        setSelectedUser(userData[0].id);
                        setUserQuota(bytesToGb(userData[0].storage_quota || gbToBytes(10)));
                    }
                }
            } catch (error) {
                console.error('Error loading admin data:', error);
                setMessage('Error loading data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Update system config
    const handleSystemUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const config = {
                max_users: maxUsers,
                default_user_quota: gbToBytes(defaultQuota),
                total_storage_limit: gbToBytes(totalLimit),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await updateSystemConfig(config);

            if (error) throw error;
            setSystemConfig(data);
            setMessage('System configuration updated successfully!');
        } catch (error) {
            console.error('Error updating system config:', error);
            setMessage('Error updating system configuration. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Update user quota
    const handleUserQuotaUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setLoading(true);
        setMessage('');

        try {
            const { success, error } = await updateUserQuota(selectedUser, gbToBytes(userQuota));

            if (error) throw error;

            // Update user in the state
            setUsers(users.map(user =>
                user.id === selectedUser
                    ? { ...user, storage_quota: gbToBytes(userQuota) }
                    : user
            ));

            setMessage('User storage quota updated successfully!');
        } catch (error) {
            console.error('Error updating user quota:', error);
            setMessage('Error updating user quota. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle user selection change
    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = e.target.value;
        setSelectedUser(userId);

        const selectedUser = users.find(user => user.id === userId);
        if (selectedUser) {
            setUserQuota(bytesToGb(selectedUser.storage_quota || gbToBytes(10)));
        }
    };

    if (loading && !systemConfig) {
        return <div className="p-6">Loading admin dashboard...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

            {message && (
                <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow">
                    <h2 className="text-lg font-medium mb-4">System Stats</h2>
                    <div className="space-y-2">
                        <p>Total Users: <span className="font-medium">{stats.userCount}</span></p>
                        <p>Active Users (7 days): <span className="font-medium">{stats.activeUsers}</span></p>
                        <p>Storage Space: <span className="font-medium">{formatBytes(stats.availableStorage)}</span> free of <span className="font-medium">{formatBytes(stats.totalStorage)}</span></p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${Math.min(100, 100 - (stats.availableStorage / stats.totalStorage * 100))}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow">
                    <h2 className="text-lg font-medium mb-4">Current Limits</h2>
                    <div className="space-y-2">
                        <p>Maximum Users: <span className="font-medium">{systemConfig?.max_users || 'Not set'}</span></p>
                        <p>Default User Quota: <span className="font-medium">{formatBytes(systemConfig?.default_user_quota || 0)}</span></p>
                        <p>Total Storage Limit: <span className="font-medium">{formatBytes(systemConfig?.total_storage_limit || 0)}</span></p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Last updated: {systemConfig?.updated_at ? new Date(systemConfig.updated_at).toLocaleString() : 'Never'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow">
                    <h2 className="text-lg font-medium mb-4">System Configuration</h2>
                    <form onSubmit={handleSystemUpdate}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Maximum Users</label>
                            <input
                                type="number"
                                min="1"
                                value={maxUsers}
                                onChange={(e) => setMaxUsers(parseInt(e.target.value))}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Maximum number of users allowed to register</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Default User Quota (GB)</label>
                            <input
                                type="number"
                                min="1"
                                value={defaultQuota}
                                onChange={(e) => setDefaultQuota(parseInt(e.target.value))}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Default storage space per user in GB</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Total Storage Limit (GB)</label>
                            <input
                                type="number"
                                min="1"
                                value={totalLimit}
                                onChange={(e) => setTotalLimit(parseInt(e.target.value))}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Total storage space allocated for all users in GB</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Update System Configuration'}
                        </button>
                    </form>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow">
                    <h2 className="text-lg font-medium mb-4">User Quotas</h2>

                    {users.length > 0 ? (
                        <form onSubmit={handleUserQuotaUpdate}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Select User</label>
                                <select
                                    value={selectedUser}
                                    onChange={handleUserChange}
                                    className="w-full p-2 border rounded-md"
                                >
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email}) - {formatBytes(user.storage_quota || 0)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Storage Quota (GB)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={userQuota}
                                    onChange={(e) => setUserQuota(parseInt(e.target.value))}
                                    className="w-full p-2 border rounded-md"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Storage space for this user in GB</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
                            >
                                {loading ? 'Updating...' : 'Update User Quota'}
                            </button>
                        </form>
                    ) : (
                        <p className="text-gray-500">No users found in the system.</p>
                    )}
                </div>
            </div>
        </div>
    );
} 