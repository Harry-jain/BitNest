import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

// JWT secret
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-default-secret-do-not-use-in-production';

// Paths that don't require authentication
const publicPaths = [
    '/',
    '/auth/login',
    '/auth/register',
    '/api/auth/login',
    '/api/auth/register',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if path is public
    if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
        return NextResponse.next();
    }

    // For API routes
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
        return validateApiToken(request);
    }

    // For authenticated routes (dashboard, etc.)
    return validateAuthCookie(request);
}

// Validate API token from Authorization header
function validateApiToken(request: NextRequest) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
            { message: 'Unauthorized - Missing or invalid token' },
            { status: 401 }
        );
    }

    const token = authHeader.split(' ')[1];

    try {
        verify(token, JWT_SECRET);
        return NextResponse.next();
    } catch (error) {
        return NextResponse.json(
            { message: 'Unauthorized - Invalid token' },
            { status: 401 }
        );
    }
}

// Validate authentication cookie
function validateAuthCookie(request: NextRequest) {
    const authCookie = request.cookies.get('bitnest_auth');

    if (!authCookie) {
        const url = new URL('/auth/login', request.url);
        url.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(url);
    }

    try {
        verify(authCookie.value, JWT_SECRET);
        return NextResponse.next();
    } catch (error) {
        // Clear invalid cookie
        const response = NextResponse.redirect(new URL('/auth/login', request.url));
        response.cookies.delete('bitnest_auth');
        return response;
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|logo.svg).*)',
    ],
}; 