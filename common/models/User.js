const mongoose = require('mongoose');

const { v4: uuidv4 } = require('uuid');
const { USER_ROLES } = require('../middlewares/IsAuthenticated');

const UserSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4 },
    email: { type: String, sparse: true, unique: true, lowercase: true, required: function () { return !this.phone; } }, // Required: required if phone missing
    phone: { type: String, unique: true, sparse: true, required: function () { return !this.email; } },
    password: { type: String, required: true },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false},

    // OTP Fields
    otpCodeHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpLockedUntil: { type: Date, default: null },
    otpVerified: { type: Boolean, default: false },

    timestamp: { type: String, default: () => new Date().toISOString() },
    role: {type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.CUSTOMER }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;