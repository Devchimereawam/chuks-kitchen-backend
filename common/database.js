// Initialize database connection using Mongoose
const mongoose = require('mongoose');

const connectDB = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chuks-kitchen-backend';

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected.")
    } catch (err) {
        console.log('MongoDB connection error:', err.message);
        process.exit(1); // Exit process gracefully
    }
};

module.exports = connectDB;
