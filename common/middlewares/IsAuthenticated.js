const jwt = require('jsonwebtoken');

// Configuration constants for the OTP
const OTP_CONFIG = Object.freeze({
    TTL_MINUTES: 10,
    MAX_ATTEMPTS: 3,
    LOCK_MINUTES: 10,
});

// Configuration constants for the USER_ROLES
const USER_ROLES = Object.freeze({
    CUSTOMER: 'customer',
    ADMIN: 'admin',
});

// Authorization to protect routes, not implemented yet until user routes is implemented.

// const authorize = (req, res, next) => {
//     // Get header from your request, produces error if not provided.
//     const authHeader = req.headers['authorization'];
//     if (!authHeader) {
//         return res.status(401).json({ error: 'No authorization header provided' });
//     }

//     // Splits the token from the bearer from the request, error if not strictly type and not token.
//     const [type, token] = authHeader.split(' ');
//     if (type !== 'Bearer' || !token) {
//         return res.status(401).json({ error: 'Invalid authorization format' });
//     }

//     // Try block to verify token or catch error.
//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
//         req.user = decoded;
//         next();
//     } catch {
//         return res.status(401).json({ error: 'Invalid or expired token' });
//     }
// };

// Export authorize when implemented.
module.exports = { OTP_CONFIG, USER_ROLES };