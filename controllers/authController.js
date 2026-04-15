require("dotenv").config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

const getProfile = async (req, res) => {
    try {
        const user = await User.findUserById(req.user.userId)

        if (!user) return res.status(404).json({
            success: false,
            message: 'User not found'
        });

        delete user.password;

        res.json({
            success: true,
            message: user
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

const saveBusinessInfo = async (req, res) => {
    try {
        const {userName, businessName, businessType } = req.body;

        if (!businessName || !businessType) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }

        const updateData = { businessName, businessType, onboardingCompleted: true };

        if (userName) updateData.name = userName;

        await User.updateBusinessInfo(req.user.userId, updateData);

        console.log('Business Info saved');

        res.json({ success: true, message: 'Business info saved' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getConnectionStatus = async (req, res) => {
    try {
        const user = await User.findUserById(req.user.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({
            success: true,
            connections: {
                google: {
                    connected: !!(user.platforms?.google?.accessToken),
                    connectedAt: user.platforms?.google?.connectedAt || null,
                },
                yelp: {
                    connected: !!(user.platforms?.yelp?.accessToken),
                    connectedAt: user.platforms?.yelp?.connectedAt || null,
                },
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {getProfile, generateToken, saveBusinessInfo, getConnectionStatus};