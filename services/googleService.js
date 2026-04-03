const axios = require('axios');

const exchangeCodeForTokens = async (code, redirectUri) => {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
    });
    return response.data;
};

const fetchGoogleProfile = async (accessToken) => {
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
};

const buildGoogleAuthUrl = (redirectUri, scope, state = null) => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
    });
    if (state) params.set('state', state);
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

module.exports = { exchangeCodeForTokens, fetchGoogleProfile, buildGoogleAuthUrl };