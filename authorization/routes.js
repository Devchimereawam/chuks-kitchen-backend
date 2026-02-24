const express = require('express');
const { register, verifySignupOtp } = require('./controller');
const Food = require('../common/models/Food');

const router = express.Router();

// Routes/Routers
router.post('/signup', register);
router.post('/signup/verify-otp', verifySignupOtp);

// /foods to get all foods in the db.
router.get('/foods', async (req, res) => {
    const foods = await Food.find().sort({ _id: -1 });
    res.json({ success: true, data: foods });
});

// Simulated admin route for adding food items. Only returns successful if admin.
router.post('/foods', async (req, res) => {
    // Checks if you are an admin, and returns error if you are not
    if (req.headers['x-admin'] !== 'true') {
        return res.status(403).json({ success: false, error: 'Admin required' });
    }

    // Creates the food item 
    const { name, price, isAvailable } = req.body;
    const food = await Food.create({ name, price, isAvailable });
    res.status(201).json({ success: true, data: food });
});

module.exports = router;