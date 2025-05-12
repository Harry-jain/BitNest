import nodemailer from 'nodemailer';
import { Twilio } from 'twilio';

// Types for notification settings
export type NotificationSettings = {
    email?: string;
    phone?: string;
    enableEmail: boolean;
    enableSMS: boolean;
};

// Load admin notification settings from environment variables
const adminEmail = process.env.ADMIN_EMAIL || '';
const adminPhone = process.env.ADMIN_PHONE || '';
const enableEmail = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
const enableSMS = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';

// Default notification settings
export const defaultNotificationSettings: NotificationSettings = {
    email: adminEmail,
    phone: adminPhone,
    enableEmail,
    enableSMS
};

// Configure email transporter
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
});

// Configure Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    )
    : null;

/**
 * Send an email notification to the admin
 */
export async function sendEmailNotification(
    subject: string,
    message: string,
    recipient: string = adminEmail
): Promise<boolean> {
    if (!enableEmail || !recipient) {
        console.log('Email notifications disabled or no recipient specified');
        return false;
    }

    try {
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'BitNest <bitnest@noreply.com>',
            to: recipient,
            subject: `BitNest: ${subject}`,
            text: message,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #4f46e5;">BitNest Notification</h2>
        <p style="margin-bottom: 20px; color: #333;">${message.replace(/\n/g, '<br/>')}</p>
        <p style="font-size: 12px; color: #666; margin-top: 30px;">This is an automated message from your BitNest system.</p>
      </div>`,
        });
        console.log(`Email notification sent: ${subject}`);
        return true;
    } catch (error) {
        console.error('Failed to send email notification:', error);
        return false;
    }
}

/**
 * Send an SMS notification to the admin
 */
export async function sendSMSNotification(
    message: string,
    recipient: string = adminPhone
): Promise<boolean> {
    if (!enableSMS || !recipient || !twilioClient) {
        console.log('SMS notifications disabled, no recipient specified, or Twilio not configured');
        return false;
    }

    try {
        await twilioClient.messages.create({
            body: `BitNest: ${message}`,
            from: process.env.TWILIO_PHONE_NUMBER || '',
            to: recipient,
        });
        console.log(`SMS notification sent: ${message}`);
        return true;
    } catch (error) {
        console.error('Failed to send SMS notification:', error);
        return false;
    }
}

/**
 * Send notification to admin via all enabled channels
 */
export async function notifyAdmin(
    subject: string,
    message: string,
    settings: NotificationSettings = defaultNotificationSettings
): Promise<void> {
    const promises: Promise<boolean>[] = [];

    if (settings.enableEmail && settings.email) {
        promises.push(sendEmailNotification(subject, message, settings.email));
    }

    if (settings.enableSMS && settings.phone) {
        promises.push(sendSMSNotification(message, settings.phone));
    }

    await Promise.all(promises);
}

/**
 * Log error and notify admin
 */
export async function logErrorAndNotify(
    error: Error | string,
    context: string
): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : '';

    console.error(`[${context}] Error:`, errorMessage);
    if (stack) console.error(stack);

    const subject = `Error in ${context}`;
    const message = `An error occurred in ${context}:\n${errorMessage}\n\n${stack || ''}`;

    await notifyAdmin(subject, message);
} 