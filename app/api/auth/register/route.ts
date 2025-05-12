import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/app/lib/mongodb';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';

// JWT secret
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-default-secret-do-not-use-in-production';

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
            const user = await registerUser(email, password, name);

            // Generate JWT token
            const token = sign(
                {
                    userId: user._id?.toString(),
                    email: user.email,
                    name: user.name
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Set cookie
            cookies().set({
                name: 'bitnest_auth',
                value: token,
                httpOnly: true,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            });

            return NextResponse.json(
                {
                    message: 'Registration successful',
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name
                    }
                },
                { status: 200 }
            );
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