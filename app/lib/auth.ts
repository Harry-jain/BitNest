import { supabase } from './supabase';
import { createHash, randomBytes } from 'crypto';
import { User } from './supabase';
import { logErrorAndNotify } from './notifications';
import QRCode from 'qrcode';
import * as OTPAuth from 'otpauth';

// 2FA verification status
export type TwoFactorStatus = {
    isEnabled: boolean;
    isVerified: boolean;
    secret?: string;
    qrCodeUrl?: string;
};

/**
 * Generate a new 2FA secret for a user
 */
export async function generateTwoFactorSecret(
    user: User
): Promise<{ secret: string; qrCodeUrl: string }> {
    // Generate a new TOTP secret
    const secret = randomBytes(20).toString('hex');

    // Create a new TOTP object
    const totp = new OTPAuth.TOTP({
        issuer: 'BitNest',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromHex(secret),
    });

    // Generate QR code URL
    const qrCodeUrl = await QRCode.toDataURL(totp.toString());

    // Store the secret in Supabase (not enabled until verified)
    const { error } = await supabase
        .from('user_2fa')
        .upsert({
            user_id: user.id,
            secret,
            verified: false,
            created_at: new Date().toISOString(),
        });

    if (error) {
        await logErrorAndNotify(error, '2FA Secret Generation');
        throw new Error('Failed to store 2FA secret');
    }

    return { secret, qrCodeUrl };
}

/**
 * Verify a 2FA token
 */
export async function verifyTwoFactorToken(
    userId: string,
    token: string
): Promise<boolean> {
    // Get the user's 2FA secret from the database
    const { data, error } = await supabase
        .from('user_2fa')
        .select('secret, verified')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        await logErrorAndNotify(error || new Error('No 2FA record found'), '2FA Verification');
        return false;
    }

    const { secret, verified } = data;

    // Create a TOTP object
    const totp = new OTPAuth.TOTP({
        issuer: 'BitNest',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromHex(secret),
    });

    // Verify the token
    const isValid = totp.validate({ token, window: 1 }) !== null;

    // If this is the first verification, mark as verified
    if (isValid && !verified) {
        const { error: updateError } = await supabase
            .from('user_2fa')
            .update({ verified: true })
            .eq('user_id', userId);

        if (updateError) {
            await logErrorAndNotify(updateError, '2FA Verification Status Update');
        }
    }

    return isValid;
}

/**
 * Check if 2FA is enabled for a user
 */
export async function getTwoFactorStatus(
    userId: string
): Promise<TwoFactorStatus> {
    const { data, error } = await supabase
        .from('user_2fa')
        .select('secret, verified')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        // No 2FA record means it's not enabled
        return { isEnabled: false, isVerified: false };
    }

    return {
        isEnabled: true,
        isVerified: data.verified,
        secret: data.secret,
    };
}

/**
 * Disable 2FA for a user
 */
export async function disableTwoFactor(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_2fa')
        .delete()
        .eq('user_id', userId);

    if (error) {
        await logErrorAndNotify(error, '2FA Disable');
        return false;
    }

    return true;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
}

/**
 * Hash a password or token
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256')
        .update(password + useSalt)
        .digest('hex');

    return { hash, salt: useSalt };
}

/**
 * Create a rate limiter function
 */
export function createRateLimiter(maxAttempts: number, timeWindowMs: number) {
    const attempts: Map<string, { count: number; timestamp: number }> = new Map();

    return (key: string): boolean => {
        const now = Date.now();
        const record = attempts.get(key);

        // No previous record
        if (!record) {
            attempts.set(key, { count: 1, timestamp: now });
            return true;
        }

        // Reset if outside time window
        if (now - record.timestamp > timeWindowMs) {
            attempts.set(key, { count: 1, timestamp: now });
            return true;
        }

        // Increment attempt count
        record.count += 1;
        attempts.set(key, record);

        // Check if exceeded max attempts
        return record.count <= maxAttempts;
    };
}

// Rate limiter for login attempts (5 attempts per 15 minutes)
export const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(
    ip: string,
    action: string = 'login'
): boolean {
    const key = `${ip}:${action}`;
    return loginRateLimiter(key);
} 