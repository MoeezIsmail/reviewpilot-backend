const User = require("../models/User");
const { generateAutoReply } = require("../services/aiService");
const {
    getAccounts,
    getLocations,
    getReviews,
    postReply,
    refreshAccessToken,
} = require("../services/googleBusinessService");

// ─── Helper: Valid Token Get Karo ────────────────────────────
const getValidAccessToken = async (user) => {
    // Pehle existing token try karo
    try {
        const accounts = await getAccounts(user.platforms.google.accessToken);
        if (accounts) return user.platforms.google.accessToken;
    } catch (err) {
        // Token expire — refresh karo
        if (err.response?.status === 401) {
            console.log('Token expired, refreshing...');
            const newToken = await refreshAccessToken(user.platforms.google.refreshToken);
            await User.updateGoogleTokens(user._id, newToken, user.platforms.google.refreshToken);
            return newToken;
        }
        throw err;
    }
};

// ─── Reviews Fetch ────────────────────────────────────────────
const getReviewsData = async (req, res) => {
    try {
        const user = await User.findUserById(req.params.id);
        console.log('User: ', user);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.platforms?.google?.accessToken) {
            return res.status(400).json({ message: "Google Business not connected" });
        }

        const accessToken = await getValidAccessToken(user);

        // Accounts fetch karo
        const accounts = await getAccounts(accessToken);
        console.log('accounts: ', accounts[0]);

        if (!accounts.length) {
            return res.status(404).json({ message: "No Google Business accounts found" });
        }

        const accountId = accounts[0].name;   // e.g. "accounts/123456"

        // Locations fetch karo
        const locations = await getLocations(accountId, accessToken);
        if (!locations.length) {
            return res.status(404).json({ message: "No locations found" });
        }

        const locationId = locations[0].name;  // e.g. "locations/123456"

        // Reviews fetch karo
        const pageToken = req.query.nextPageToken || null;
        const { reviews, nextPageToken } = await getReviews(accountId, locationId, accessToken, pageToken);

        console.log('Reviews: ', reviews);

        // accountId aur locationId bhi bhejo — reply ke liye zaroorat hogi
        res.json({ accounts });

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