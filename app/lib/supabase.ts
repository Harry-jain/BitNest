import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for Supabase tables
export type User = {
    id: string;
    email: string;
    created_at: string;
    updated_at?: string;
    last_login_at?: string;
    name: string;
    role?: 'user' | 'admin';
    storage_quota?: number; // in bytes
}

export type FileRecord = {
    id: string;
    name: string;
    size: number;
    type: string;
    path: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    is_public: boolean;
}

export type VideoMetadata = {
    id: string;
    title: string;
    description?: string;
    duration: number;
    format: string;
    qualities: string[];
    thumbnail_path?: string;
    file_id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export type SystemConfig = {
    id: string;
    max_users: number;
    default_user_quota: number; // in bytes
    total_storage_limit: number; // in bytes
    created_at: string;
    updated_at: string;
}

// Authentication functions
export async function signIn(email: string, password: string): Promise<{ user: User | null, session: any, error: any }> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        // Get user profile data
        const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user?.id)
            .single();

        if (userError) {
            console.error('Error fetching user profile:', userError);
        }

        return {
            user: userData as User,
            session: data.session,
            error: null
        };
    } catch (error) {
        console.error('Error signing in:', error);
        return {
            user: null,
            session: null,
            error
        };
    }
}

export async function signInWithGoogle(): Promise<{ error: any }> {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        return { error };
    } catch (error) {
        console.error('Error signing in with Google:', error);
        return { error };
    }
}

export async function signInWithGithub(): Promise<{ error: any }> {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        return { error };
    } catch (error) {
        console.error('Error signing in with GitHub:', error);
        return { error };
    }
}

export async function signUp(email: string, password: string, name: string): Promise<{ user: User | null, session: any, error: any }> {
    try {
        // Get system config for user quota
        const { data: configData } = await supabase
            .from('system_config')
            .select('default_user_quota')
            .single();

        const defaultQuota = configData?.default_user_quota || 10 * 1024 * 1024 * 1024; // Default 10GB

        // Register with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            // Add user to profiles table
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    id: data.user.id,
                    email: data.user.email,
                    name: name,
                    created_at: new Date().toISOString(),
                    role: 'user',
                    storage_quota: defaultQuota
                })
                .select()
                .single();

            if (profileError) {
                console.error('Error creating user profile:', profileError);
                return {
                    user: null,
                    session: null,
                    error: profileError
                };
            }

            return {
                user: profileData as User,
                session: data.session,
                error: null
            };
        }

        return {
            user: null,
            session: data.session,
            error: new Error('User creation failed')
        };
    } catch (error) {
        console.error('Error signing up:', error);
        return {
            user: null,
            session: null,
            error
        };
    }
}

export async function signOut(): Promise<{ error: any }> {
    try {
        const { error } = await supabase.auth.signOut();
        return { error };
    } catch (error) {
        console.error('Error signing out:', error);
        return { error };
    }
}

export async function getCurrentSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        return null;
    }

    // Get user profile data
    const { data: userData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return userData as User;
}

// Admin functions
export async function updateSystemConfig(config: Partial<SystemConfig>): Promise<{ data: SystemConfig | null, error: any }> {
    try {
        // There should only be one config row, with id='default'
        const { data, error } = await supabase
            .from('system_config')
            .update(config)
            .eq('id', 'default')
            .select()
            .single();

        if (error) throw error;
        return { data: data as SystemConfig, error: null };
    } catch (error) {
        console.error('Error updating system config:', error);
        return { data: null, error };
    }
}

export async function updateUserQuota(userId: string, newQuota: number): Promise<{ success: boolean, error: any }> {
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ storage_quota: newQuota })
            .eq('id', userId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Error updating user quota:', error);
        return { success: false, error };
    }
}

export async function getSystemStats(): Promise<{
    userCount: number,
    activeUsers: number,
    totalStorage: number,
    availableStorage: number,
    error: any
}> {
    try {
        // Get user count
        const { count: userCount, error: userError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });

        if (userError) throw userError;

        // Get active users (logged in within last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: activeUsers, error: activeError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_login_at', sevenDaysAgo.toISOString());

        if (activeError) throw activeError;

        // Get storage info from system
        const { totalSpace, availableSpace } = await import('./storage').then(m => m.getStorageInfo());

        return {
            userCount: userCount || 0,
            activeUsers: activeUsers || 0,
            totalStorage: totalSpace,
            availableStorage: availableSpace,
            error: null
        };
    } catch (error) {
        console.error('Error getting system stats:', error);
        return {
            userCount: 0,
            activeUsers: 0,
            totalStorage: 0,
            availableStorage: 0,
            error
        };
    }
}

export default supabase; 