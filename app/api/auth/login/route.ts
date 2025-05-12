import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/app/lib/mongodb';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';

// JWT secret
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-default-secret-do-not-use-in-production';

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
            const user = await loginUser(email, password);

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
                    message: 'Login successful',
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