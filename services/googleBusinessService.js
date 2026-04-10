const axios = require('axios');

const BASE_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const REVIEWS_BASE_URL = 'https://mybusiness.googleapis.com/v4';

const getAccounts = async (accessToken) => {
    const res = await axios.get(`${BASE_URL}/accounts`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    return res.data.accounts || [];
};

const getLocations = async (accountId, accessToken) => {
    console.log('account ID: ', accountId);
    const res = await axios.get(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { readMask: 'name,title,storefrontAddress' }
        }
    );

    console.log('Service location: ', res.data);

    return res.data.locations || [];
};

const getReviews = async (accountId, locationId, accessToken, pageToken = null) => {
    const params = { pageSize: 10 };
    if (pageToken) params.pageToken = pageToken;

    const res = await axios.get(
        `${REVIEWS_BASE_URL}/${accountId}/${locationId}/reviews`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
            params,
        }
    );

    return {
        reviews: res.data.reviews || [],
        nextPageToken: res.data.nextPageToken || null,
    };
};

const postReply = async (accountId, locationId, reviewId, replyText, accessToken) => {
    const res = await axios.put(
        `${REVIEWS_BASE_URL}/${accountId}/${locationId}/reviews/${reviewId}/reply`,
        { comment: replyText },
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.data;
};

const refreshAccessToken = async (refreshToken) => {
    const res = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    });
    return res.data.access_token;
};

module.exports = {
    getAccounts,
    getLocations,
    getReviews,
    postReply,
    refreshAccessToken,
};