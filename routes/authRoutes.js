const router = require("express").Router();
const verifyToken = require('../middleware/authMiddleware');
const { getProfile, saveBusinessInfo, getConnectionStatus} = require('../controllers/authController');
const { sendOTP, verifyOTP } = require('../controllers/otpController');
const {
    googleConnectRedirect,
    googleConnectCallback,
    googleLoginRedirect,
    googleLoginCallback,
} = require('../controllers/googleController');

// ─── Auth ──────────────────────────────────────────
router.get('/profile', verifyToken, getProfile);
router.post('/business-info', verifyToken, saveBusinessInfo);

// ─── OTP ───────────────────────────────────────────
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// ─── Google Business Connect ───────────────────────
router.post('/google/init', verifyToken, (req, res) => {
    req.session.pendingUserId = req.user.userId;
    req.session.connectFrom = req.body.from || 'connect-platforms';
    res.json({ success: true });
});
router.get('/google', googleConnectRedirect);
router.get('/google/callback', googleConnectCallback);

// ─── Google Login / Register ───────────────────────
router.get('/google-login', googleLoginRedirect);
router.get('/google-login/callback', googleLoginCallback);

// ─── Google / Yelp Connection Status ───────────────────────
router.get('/settings/connections', verifyToken, getConnectionStatus);

module.exports = router;