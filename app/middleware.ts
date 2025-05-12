import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';

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
    if (pathname.startsWith('/api/')) {
        if (pathname.startsWith('/api/auth/')) {
            return NextResponse.next();
        }
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
        // Verify token and attach user info to request
        const decoded = verify(token, JWT_SECRET) as JwtPayload;

        // Check resource access permission
        const { pathname } = request.nextUrl;
        const requestedUserId = request.nextUrl.searchParams.get('userId');

        // If a userId is specified in the query and doesn't match the token's userId, deny access
        if (requestedUserId && decoded.userId !== requestedUserId) {
            return NextResponse.json(
                { message: 'Forbidden - You cannot access another user\'s resources' },
                { status: 403 }
            );
        }

        // Continue with authenticated request
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', decoded.userId);
        requestHeaders.set('x-user-email', decoded.email);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
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
        // Verify token and attach user info to request headers
        const decoded = verify(authCookie.value, JWT_SECRET) as JwtPayload;

        // Check if accessing another user's page
        const { pathname } = request.nextUrl;
        const segments = pathname.split('/');
        const userIdInPath = segments.findIndex((segment) => segment === 'users') + 1;

        // If trying to access another user's path, deny access
        if (userIdInPath > 0 && userIdInPath < segments.length && segments[userIdInPath] !== decoded.userId) {
            // Redirect to unauthorized page
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', decoded.userId);
        requestHeaders.set('x-user-email', decoded.email);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
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