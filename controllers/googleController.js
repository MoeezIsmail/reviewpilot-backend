const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken } = require('./authController');
const { exchangeCodeForTokens, fetchGoogleProfile, buildGoogleAuthUrl } = require('../services/googleService');
const crypto = require('crypto');
const {getAccounts} = require("../services/googleBusinessService");

const googleConnectRedirect = (req, res) => {
    // Token URL se nahi — session se lo
    const userId = req.session.pendingUserId;

    if (!userId) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=no_session`);
    }

    const csrfToken = crypto.randomBytes(32).toString('hex');

    req.session.oauthState = {
        userId: userId.toString(),
        csrfToken,
        expiresAt: Date.now() + 10 * 60 * 1000,
        from: req.session.connectFrom || 'connect-platforms',
    };
    req.session.pendingUserId = null;  // Clear karo

    const state = Buffer.from(JSON.stringify({ csrfToken })).toString('base64');

    const url = buildGoogleAuthUrl(
        process.env.GOOGLE_CALLBACK_URL,
        ['openid', 'profile', 'email',
            'https://www.googleapis.com/auth/business.manage'].join(' '),
        state
    );

    res.redirect(url);
};

const googleConnectCallback = async (req, res) => {
    const { code, state, error } = req.query;

    if (error || !state || !code) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=google_failed`);
    }

    try {
        // Extract CSRF token from the state
        const { csrfToken } = JSON.parse(Buffer.from(state, 'base64').toString());
        const savedState = req.session.oauthState;

        // CSRF verification
        if (!savedState || savedState.csrfToken !== csrfToken) {
            console.log('CSRF mismatch!');
            return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=invalid_state`);
        }

        // Expiry check
        if (Date.now() > savedState.expiresAt) {
            req.session.oauthState = null;
            return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=state_expired`);
        }

        const userId = savedState.userId;
        req.session.oauthState = null; // Clear session state

        // Exchange code for tokens
        const { access_token, refresh_token } = await exchangeCodeForTokens(code, process.env.GOOGLE_CALLBACK_URL);
        const profile = await fetchGoogleProfile(access_token);

        // Fetch accounts associated with the Google My Business API
        const accountsRes = await getAccounts(access_token);

        // Ensure the user selects an account ID from the available accounts
        const selectedAccountId = req.body.selectedAccountId;  // Assuming the user selects the account via a form or UI

        // Find the selected account from the accounts list
        const selectedAccount = accountsRes.find(account => account.name === selectedAccountId);

        if (!selectedAccount) {
            return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=no_business`);
        }

        // Fetch the locations (businesses) for the selected account
        const locations = await getLocations(selectedAccount.name, access_token);

        if (!locations || locations.length === 0) {
            return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=no_business`);
        }

        // If business is found, connect the Google account to the user's profile
        await User.connectGoogle(userId, {
            googleId: profile.id,
            accessToken: access_token,
            refreshToken: refresh_token,
            googleName: profile.name,
            googleEmail: profile.email,
        });

        console.log('Google Business connected!');
        const redirectPage = savedState.from || 'connect-platforms';
        res.redirect(`${process.env.FRONTEND_URL}/${redirectPage}?google=success`);

    } catch (err) {
        console.log('Full error:', err);
        console.log('Error message:', err.message);
        console.log('Google business callback error:', err.response?.data || err.message);
        res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=google_failed`);
    }
};

const googleLoginRedirect = (req, res) => {
    const url = buildGoogleAuthUrl(
        process.env?.GOOGLE_LOGIN_CALLBACK_URL,
        'openid profile email'
    );
    res.redirect(url);
};

const googleLoginCallback = async (req, res) => {
    const { code, error } = req.query;

    if (error || !code) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=google_failed`);
    }

    try {
        const tokenData = await exchangeCodeForTokens(code, process.env.GOOGLE_LOGIN_CALLBACK_URL);
        const { access_token, refresh_token } = tokenData;
        const { id: googleId, email, name } = await fetchGoogleProfile(access_token);

        let user = await User.findUserByGoogleId(googleId);
        let isNewUser = false;

        if (!user) {
            user = await User.findUserByEmail(email);
            if (user) {
                await User.connectGoogle(user._id, {
                    googleId,
                    accessToken: access_token,
                    refreshToken: refresh_token,
                });
                // Updated user fetch karo
                user = await User.findUserById(user._id);
            } else {
                const result = await User.createUser({
                    name,
                    email,
                    googleId,
                    isEmailVerified: true,
                    platforms: { google: null, yelp: null },
                    createdAt: new Date(),
                });
                user = { _id: result.insertedId, email, name };
                isNewUser = true;
            }
        }

        const token = generateToken(user);
        const isAnyPlatformConnected = !!(user.platforms?.google?.accessToken);

        res.redirect(
            `${process.env?.FRONTEND_URL}/auth/success?token=${token}&isNewUser=${isNewUser}&isAnyPlatformConnected=${isAnyPlatformConnected}`
        );

    } catch (err) {
        console.error('Google login callback error:', err.response?.data || err.message);
        res.redirect(`${process.env?.FRONTEND_URL}/auth?error=google_failed`);
    }
};

module.exports = {
    googleConnectRedirect,
    googleConnectCallback,
    googleLoginRedirect,
    googleLoginCallback,
};