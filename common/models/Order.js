const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
    {
        foodId: { type: String, required: true },
        foodNameSnapshot: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPriceSnapshot: { type: Number, required: true, min: 0 },
        addedAt: { type: String, default: () => new Date().toISOString() },
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    status: { type: String, enum: ['cart', 'placed', 'cancelled'], default: 'cart', index: true },
    items: { type: [OrderItemSchema], default: [] },
    placedAt: { type: String, default: null },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
});

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);