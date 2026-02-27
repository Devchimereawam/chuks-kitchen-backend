// Controller file with all control logic.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../common/models/User');
const { OTP_CONFIG, USER_ROLES } = require('../common/middlewares/IsAuthenticated');

// Hashing using bcrypt.
const encryptValue = (password) =>
    crypto.createHash('sha256').update(password).digest('hex');

// Generate access token using jwt for authorization.
const generateAccessToken = (userId, email, phone, role) =>
    jwt.sign(
        { userId, email: email || null, phone: phone || null, role: role || USER_ROLES.CUSTOMER },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );

// Generate otp betwen 100k and 999k using the random function.
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const buildUserIdentityFilter = (userId, email, phone) => {
    const filters = [];
    if (userId) return { id: String(userId).trim() };
    if (email) filters.push({ email: email.toLowerCase() });
    if (phone) filters.push({ phone });
    return filters.length ? { $or: filters } : null;
};

const normalizeRole = (role) => {
    if (!role) return USER_ROLES.CUSTOMER;
    const normalizedRole = String(role).toLowerCase().trim();
    return Object.values(USER_ROLES).includes(normalizedRole) ? normalizedRole : null;
}

exports.register = async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName, role } = req.body;

        const userFilter = buildUserIdentityFilter(undefined, email, phone);

        const selectedRole = normalizeRole(role);

        if (!selectedRole) {
            return res.status(400).json({
                success: false,
                error: `Invalid role. Allowed roles: ${Object.values(USER_ROLES).join(', ')}`
            });
        }

        if (selectedRole === USER_ROLES.ADMIN && req.headers['x-admin'] !== 'true') {
            return res.status(403).json({
                success: false,
                error: 'Admin simulation required to create admin accounts.'
            });
        }

        const existingUser = await User.findOne(userFilter);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email or phone already exists.'
            });
        }

        const encryptedPassword = encryptValue(password);
        const otp = generateOtp();
        const otpCodeHash = encryptValue(otp);
        const otpExpiresAt = new Date(Date.now() + OTP_CONFIG.TTL_MINUTES * 60 * 1000);

        const user = await User.create({
            email: email ? email.toLowerCase() : undefined,
            phone,
            password: encryptedPassword,
            firstName,
            lastName,
            role: selectedRole,
            otpCodeHash,
            otpExpiresAt,
            otpAttempts: 0,
            otpLockedUntil: undefined,
            otpVerified: false
        });

        const responseBody = {
            success: true,
            message: 'Signup successful. Verify OTP to complete account verification.',
            otpExpiresInMinutes: OTP_CONFIG.TTL_MINUTES,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                timestamp: user.timestamp,
                otpVerified: user.otpVerified
            }
        };

        // If app is not running in production, include OTP in API response so it can be used for manual testing/verification. In production, OTP is hidden.
        if (process.env.NODE_ENV !== 'production') {
            responseBody.otp = otp;
        }

        return res.status(201).json(responseBody);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.verifySignupOtp = async (req, res) => {
    try {
        const { userId, email, phone, otp } = req.body;

        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.'
            });
        }

        const isOtpMatch = encryptValue(String(otp).trim()) === user.otpCodeHash;
        if (!isOtpMatch) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP.'
            });
        }

        user.otpVerified = true;
        user.otpCodeHash = undefined;
        user.otpExpiresAt = undefined;
        user.otpAttempts = 0;
        user.otpLockedUntil = undefined;
        await user.save();

        const accessToken = generateAccessToken(user.id, user.email, user.phone, user.role);

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully.',
            token: accessToken
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
}
