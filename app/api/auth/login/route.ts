import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        // Validate inputs
        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Authenticate user
        try {
            const { user, session, error } = await signIn(email, password);

            if (error) {
                return NextResponse.json(
                    { message: error.message || 'Authentication failed' },
                    { status: 401 }
                );
            }

            if (!session) {
                return NextResponse.json(
                    { message: 'Failed to create session' },
                    { status: 401 }
                );
            }

            // Create response
            const response = NextResponse.json(
                {
                    message: 'Login successful',
                    user: {
                        id: user?.id,
                        email: user?.email,
                        name: user?.name
                    }
                },
                { status: 200 }
            );

            // Set the session token in the cookie
            response.cookies.set({
                name: 'sb-auth-token',
                value: session.access_token,
                httpOnly: true,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                sameSite: 'strict',
            });

            return response;
        } catch (err: any) {
            return NextResponse.json(
                { message: err.message || 'Authentication failed' },
                { status: 401 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
} 