const express = require("express")
const router = express.Router()

const { getReviewsData, getAiReply, approveReply} = require("../controllers/reviewsController")
const verifyToken = require("../middleware/authMiddleware");
const User = require("../models/User");
const axios = require("axios");

// router.get("/test-google/:id", verifyToken, async (req, res) => {
//     const User = require('../models/User');
//     const axios = require('axios');
//
//     try {
//         const user = await User.findUserById(req.params.id);
//         const accessToken = user.platforms.google.accessToken;
//
//         // Test 1 — Accounts
//         const accounts = await axios.get(
//             'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
//             { headers: { Authorization: `Bearer ${accessToken}` } }
//         );
//         console.log('✅ Accounts:', JSON.stringify(accounts.data, null, 2));
//
//         // Test 2 — Locations
//         const accountId = accounts.data.accounts[0].name;
//         const locations = await axios.get(
//             `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
//             {
//                 headers: { Authorization: `Bearer ${accessToken}` },
//                 params: { readMask: 'name,title' }
//             }
//         );
//         console.log('✅ Locations:', JSON.stringify(locations.data, null, 2));
//
//         // Test 3 — Reviews
//         const locationId = locations.data.locations[0].name;
//         const reviews = await axios.get(
//             `https://mybusiness.googleapis.com/v4/${locationId}/reviews`,
//             { headers: { Authorization: `Bearer ${accessToken}` } }
//         );
//         console.log('✅ Reviews:', JSON.stringify(reviews.data, null, 2));
//
//         res.json({
//             accounts: accounts.data,
//             locations: locations.data,
//             reviews: reviews.data,
//         });
//
//     } catch (err) {
//         console.error('❌ Error:', err.response?.data || err.message);
//         res.json({ error: err.response?.data || err.message });
//     }
// });
// router.get("/:id", verifyToken, getReviewsData)
router.post("/:reviewId/auto-reply", verifyToken, getAiReply)
router.post("/:reviewId/approve-reply", verifyToken, approveReply)


module.exports = router