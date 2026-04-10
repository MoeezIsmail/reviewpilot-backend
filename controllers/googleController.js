const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {generateToken} = require('./authController');
const {exchangeCodeForTokens, fetchGoogleProfile, buildGoogleAuthUrl} = require('../services/googleService');
const crypto = require('crypto');
const {getAccounts, getLocations} = require("../services/googleBusinessService");

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

    const state = Buffer.from(JSON.stringify({csrfToken})).toString('base64');

    const url = buildGoogleAuthUrl(
        process.env.GOOGLE_CALLBACK_URL,
        ['openid', 'profile', 'email',
            'https://www.googleapis.com/auth/business.manage'].join(' '),
        state
    );

    res.redirect(url);
};

const googleConnectCallback = async (req, res) => {
    const {code, state, error} = req.query;

    if (error || !state || !code) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=google_failed`);
    }

    try {
        // State se csrfToken nikalo
        const {csrfToken} = JSON.parse(Buffer.from(state, 'base64').toString());

        // Session se savedState lo
        const savedState = req.session.oauthState;

        // CSRF verify karo
        if (!savedState || savedState.csrfToken !== csrfToken) {
            console.log('CSRF mismatch!');
            return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=invalid_state`);
        }

        // Expiry check karo
        if (Date.now() > savedState.expiresAt) {
            req.session.oauthState = null;
            return res.redirect(`${process.env.FRONTEND_URL}/connect-platforms?error=state_expired`);
        }

        // UserId session se lo — URL se nahi ✅
        const userId = savedState.userId;

        // Use ke baad delete karo
        req.session.oauthState = null;

        // Tokens exchange karo
        const {access_token, refresh_token} = await exchangeCodeForTokens(
            code,
            process.env.GOOGLE_CALLBACK_URL
        );
        const profile = await fetchGoogleProfile(access_token);


        const accountsRes = await getAccounts(access_token);

        if (accountsRes.length === 0) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/connect-platforms?error=no_business`
            );
        }

        const accountId = accountsRes[0]?.name;

        const locationRes = await getLocations(accountId, access_token);

        if (locationRes.length === 0) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/connect-platforms?error=no_location`
            );
        }

        const locationId = locationRes[0]?.name;

        await User.connectGoogle(userId, {
            googleId: profile.id,
            accessToken: access_token,
            refreshToken: refresh_token,
            accountId: accountId,
            locationId: locationId,
            googleName: profile.name,
            googleEmail: profile.email,
        });

        console.log('Google Business connected!');
        const redirectPage = savedState.from || 'connect-platforms';
        res.redirect(`${process.env?.FRONTEND_URL}/${redirectPage}?google=success`);

    } catch (err) {
        console.log('Full error:', err);
        console.log('Error message:', err.message);
        console.log('Error code:', err.code);
        console.log('Response data:', err.response?.data);
        console.log('Response status:', err.response?.status);
        console.log('Google business callback error:', err.response?.data || err.message);
        res.redirect(`${process.env?.FRONTEND_URL}/connect-platforms?error=google_failed`);
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
    const {code, error} = req.query;

    if (error || !code) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=google_failed`);
    }

    try {
        const tokenData = await exchangeCodeForTokens(code, process.env.GOOGLE_LOGIN_CALLBACK_URL);
        const {access_token, refresh_token} = tokenData;
        const {id: googleId, email, name} = await fetchGoogleProfile(access_token);

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
                    platforms: {google: null, yelp: null},
                    createdAt: new Date(),
                });
                user = {_id: result.insertedId, email, name};
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