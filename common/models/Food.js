const mongoose = require('mongoose');

const FoodSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
});

module.exports = mongoose.models.Food || mongoose.model('Food', FoodSchema);