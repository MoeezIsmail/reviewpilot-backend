const jwt = require('jsonwebtoken');

module.exports = function verifyToken (req, res, next)  {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ success: false, message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Invalid token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // usually { id: userId, email: ... }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token invalid' });
    }
};