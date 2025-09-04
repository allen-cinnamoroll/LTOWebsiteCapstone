import nodemailer from 'nodemailer';
import otpGenerator from 'otp-generator';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate OTP
export const generateOTP = () => {
  return otpGenerator.generate(6, {
    upperCase: false,
    specialChars: false,
    alphabets: false
  });
};

// Send OTP via email
export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'LTO Website Authentication OTP',
    html: `
      <h1>Authentication Required</h1>
      <p>Your One-Time Password (OTP) for LTO Website authentication is:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 5 minutes.</p>
      <p>If you did not request this OTP, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};
