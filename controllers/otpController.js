const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('./authController');

const otpStore = new Map();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

const sendOTP = async (req, res) => {
    console.log('send OTP');
    try {
        const { email } = req.body;
        console.log('email: ', email)
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });

        const otp = crypto.randomInt(100000, 999999).toString();
        otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

        await transporter.sendMail({
            from: `"ReviewPilot" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your ReviewPilot OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
                    <h2 style="color: #4f46e5;">ReviewPilot</h2>
                    <p>Your verification code is:</p>
                    <h1 style="letter-spacing: 8px; color: #4f46e5;">${otp}</h1>
                    <p style="color: #888;">This code expires in 10 minutes.</p>
                </div>
            `,
        });

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

        const stored = otpStore.get(email);
        if (!stored) return res.status(400).json({ success: false, message: 'OTP not found. Request a new one.' });
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
        }
        if (stored.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

        otpStore.delete(email);

        let user = await User.findUserByEmail(email);
        let isNewUser = false;

        if (!user) {
            const result = await User.createUser({
                email,
                isEmailVerified: true,
                platforms: { google: null, yelp: null },
                createdAt: new Date(),
            });
            user = { _id: result.insertedId, email };
            isNewUser = true;
        }

        const token = generateToken(user);
        const isAnyPlatformConnected = !!(user.platforms?.google?.accessToken) ||
            !!(user.platforms?.yelp?.accessToken);

        res.json({ success: true, token, isNewUser, isAnyPlatformConnected });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { sendOTP, verifyOTP };