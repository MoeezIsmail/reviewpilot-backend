const express = require("express")
const router = express.Router()

const { getReviewsData, getAiReply, approveReply} = require("../controllers/reviewsController")
const verifyToken = require("../middleware/authMiddleware");
const User = require("../models/User");
const axios = require("axios");


router.get("/:id", verifyToken, getReviewsData)
router.post("/:reviewId/ai-reply", verifyToken, getAiReply)
router.post("/:reviewId/post-reply", verifyToken, approveReply)


module.exports = router