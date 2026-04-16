const User = require("../models/User");
const { generateAutoReply } = require("../services/aiService");
const {
    getAccounts,
    getLocations,
    getReviews,
    postReply,
    refreshAccessToken,
} = require("../services/googleBusinessService");
const axios = require('axios');

// ─── Helper: Valid Token Get Karo ────────────────────────────
const getValidAccessToken = async (user) => {
    const accessToken = user.platforms.google.accessToken;
    const refreshToken = user.platforms.google.refreshToken;

    try {
        await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return accessToken;
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('Token expired, refreshing...');
            const newToken = await refreshAccessToken(refreshToken);
            await User.updateGoogleTokens(user._id, newToken, refreshToken);
            return newToken;
        }
        throw err;
    }
};

// ─── Reviews Fetch ────────────────────────────────────────────
const getReviewsData = async (req, res) => {
    console.log('in Reviews data')
    try {
        const user = await User.findUserById(req.params.id);
        console.log('User: ', user);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.platforms?.google?.accessToken) {
            return res.status(400).json({ message: "Google Business not connected" });
        }

        const accessToken = await getValidAccessToken(user);

        const accountId = user.platforms.google.accountId;

        console.log('review COntroller Account ID: ', accountId)

        const locationId = user.platforms.google.locationId;


        console.log('review COntroller location ID: ', locationId)

        if (!accountId || !locationId) {
            return res.status(400).json({ message: "Business location not found. Please reconnect Google." });
        }

        // Reviews fetch karo
        const pageToken = req.query.nextPageToken || null;
        const { reviews, nextPageToken } = await getReviews(accountId, locationId, accessToken, pageToken);

        console.log('Reviews: ', reviews);

        // accountId aur locationId bhi bhejo — reply ke liye zaroorat hogi
        res.json({ reviews, nextPageToken, accountId, locationId });

    } catch (err) {
        console.error('getReviewsData error:', err.response?.data || err.message);
        res.status(500).json({ message: "Failed to load reviews", error: err.message });
    }
};

// ─── AI Reply Generate ────────────────────────────────────────
const getAiReply = async (req, res) => {
    try {
        const { reviewText } = req.body;
        if (!reviewText) return res.status(400).json({ message: "Review text is required" });

        const autoReply = await generateAutoReply(reviewText);
        res.json({ reply: autoReply });

    } catch (err) {
        console.error("getAiReply error:", err.message);
        res.status(500).json({ message: "Failed to generate auto-reply", error: err.message });
    }
};

// ─── Reply Approve & Post ──────────────────────────────────────
const approveReply = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reply, accountId, locationId } = req.body;

        if (!reply) return res.status(400).json({ message: "Reply is required" });
        if (!accountId || !locationId) return res.status(400).json({ message: "accountId and locationId required" });

        const user = await User.findUserById(req.user.userId);
        const accessToken = await getValidAccessToken(user);

        // reviewId format: "accounts/123/locations/456/reviews/789"
        // Sirf last part chahiye
        const reviewName = reviewId.split('/').pop();

        await postReply(accountId, locationId, reviewName, reply, accessToken);

        res.json({ message: "Reply posted to Google Business Profile!" });

    } catch (err) {
        console.error("approveReply error:", err.response?.data || err.message);
        res.status(500).json({ message: "Failed to post reply", error: err.message });
    }
};

module.exports = { getReviewsData, getAiReply, approveReply };