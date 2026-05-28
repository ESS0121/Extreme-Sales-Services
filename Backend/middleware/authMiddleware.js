// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
    // If we pass a single role as a string, make it an array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // 1. Get the token from "Authorization" header
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
        }

        const token = authHeader.split(' ')[1];

        try {
            // 2. Verify the token using the secret stored in env
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
            
            // 3. Attach the decoded user payload to the req object
            req.user = decoded;

            // 4. Check if the user's role is allowed
            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ success: false, message: 'Forbidden: You do not have the required role' });
            }

            next();
        } catch (error) {
            console.error("JWT Error:", error);
            res.status(401).json({ success: false, message: 'Invalid or Expired Token' });
        }
    };
};

module.exports = authMiddleware;
