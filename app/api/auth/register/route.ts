import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { email, password, name } = await request.json();

        // Validate inputs
        if (!email || !password || !name) {
            return NextResponse.json(
                { message: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { message: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate password strength (at least 8 characters)
        if (password.length < 8) {
            return NextResponse.json(
                { message: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Register user
        try {
            const { user, session, error } = await signUp(email, password, name);

            if (error) {
                return NextResponse.json(
                    { message: error.message || 'Registration failed' },
                    { status: 400 }
                );
            }

            if (!session) {
                return NextResponse.json(
                    { message: 'Failed to create session' },
                    { status: 400 }
                );
            }

            // Create response
            const response = NextResponse.json(
                {
                    message: 'Registration successful',
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
                { message: err.message || 'Registration failed' },
                { status: 400 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
} 