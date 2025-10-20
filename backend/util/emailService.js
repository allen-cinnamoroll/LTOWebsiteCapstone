import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Check if email credentials are present
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email credentials are missing in .env file');
    console.log('To set up Gmail SMTP:');
    console.log('1. Enable 2-Factor Authentication on your Gmail account');
    console.log('2. Generate an App Password: https://myaccount.google.com/apppasswords');
    console.log('3. Add to your .env file:');
    console.log('   EMAIL_USER=your-gmail@gmail.com');
    console.log('   EMAIL_PASSWORD=your-16-character-app-password');
}

// Gmail SMTP Configuration
// For Gmail, you need to:
// 1. Enable 2-Factor Authentication on your Google account
// 2. Generate an App Password (not your regular password)
// 3. Use the App Password in EMAIL_PASSWORD environment variable
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL/TLS
    auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASSWORD?.trim() // This should be your Gmail App Password
    },
    tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
    },
    debug: false // Set to true for debugging
});

export const sendOTPEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for LTO Website Login',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Login Verification</h2>
                    <p>Your One-Time Password (OTP) for LTO Website login is:</p>
                    <h1 style="color: #4a90e2; font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 5px;">${otp}</h1>
                    <p>This OTP will expire in 5 minutes.</p>
                    <p>If you didn't request this OTP, please ignore this email.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated message, please do not reply.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

export const sendPasswordResetOTP = async (email, otp) => {
    try {
        // Check if email credentials are configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.log('Email credentials not configured. OTP for password reset:', otp);
            console.log('Email would be sent to:', email);
            return true; // Return true for development/testing
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset - LTO Website',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>You have requested to reset your password for your LTO Website account.</p>
                    <p>Your One-Time Password (OTP) for password reset is:</p>
                    <h1 style="color: #4a90e2; font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 5px;">${otp}</h1>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated message, please do not reply.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        // For development, log the OTP so you can test
        console.log('DEVELOPMENT MODE: Password reset OTP is:', otp);
        console.log('Email would be sent to:', email);
        return true; // Return true for development/testing
    }
};