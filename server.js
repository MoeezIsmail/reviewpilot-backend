require("dotenv").config();

const express = require("express");
const app = express();
app.set('trust proxy', 1);

const cors = require("cors");
const { connectDB } = require('./dbConfig/db');
const authRoutes = require('./routes/authRoutes');
const reviewRoutes = require('./routes/reviewsRoutes');
const session = require('express-session');

app.use(cors({
    origin: process.env?.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());

const PORT = process.env?.PORT || 5000;

// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
// }));

app.use(session({
    secret: process.env?.SESSION_SECRET || "mysecret321",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,       // JS se access nahi hoga
        secure: process.env?.NODE_ENV === 'production',  // HTTPS only in production
        maxAge: 10 * 60 * 1000,  // 10 minutes
    }
}));

app.get("/", (req, res) => {
    res.send("ReviewPilot API running");
});

app.use('/api/auth', authRoutes);
app.use("/api/reviews", reviewRoutes)

async function startServer() {
    try {
        // await connectDB();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

startServer();
