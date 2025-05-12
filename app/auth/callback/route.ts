import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

// This handler processes callbacks from OAuth providers (Google, GitHub)
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth callback error:', error);
            return NextResponse.redirect(new URL('/login?error=Authentication%20failed', request.url));
        }

        // Success! Check if we need to create a user profile
        if (data.user) {
            // Check if the user profile exists already
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('id', data.user.id)
                .single();

            // If the profile doesn't exist, create it
            if (profileError || !profileData) {
                // Get system config for default quota
                const { data: configData } = await supabase
                    .from('system_config')
                    .select('default_user_quota')
                    .single();

                const defaultQuota = configData?.default_user_quota || 10 * 1024 * 1024 * 1024; // Default 10GB

                // Create the profile for the OAuth user
                await supabase.from('user_profiles').insert({
                    id: data.user.id,
                    email: data.user.email || '',
                    name: data.user.user_metadata.name || data.user.user_metadata.full_name || 'User',
                    role: 'user',
                    storage_quota: defaultQuota,
                    created_at: new Date().toISOString()
                });
            }
        }

        // Redirect to the app
        return NextResponse.redirect(new URL('/', request.url));
    }

    // If there's no code, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
} 