import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Check if email credentials are present
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email credentials are missing in .env file');
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASSWORD?.trim()
    },
    debug: true // Enable debug mode
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
