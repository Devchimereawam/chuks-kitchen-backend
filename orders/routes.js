const express = require('express');
const mongoose = require('mongoose');
const User = require('../common/models/User');
const Food = require('../common/models/Food');
const Order = require('../common/models/Order');

const router = express.Router();

const findUser = (userId) => User.findOne({ id: String(userId).trim() });

const findActiveCart = (userId) =>
    Order.findOne({ userId: String(userId).trim(), status: 'cart' });

const toOrderView = (order) => {
    const items = order.items.map((item) => ({
        foodId: item.foodId,
        foodName: item.foodNameSnapshot,
        unitPrice: item.unitPriceSnapshot,
        quantity: item.quantity,
        lineTotal: item.unitPriceSnapshot * item.quantity,
    }));

    return {
        id: String(order._id),
        userId: order.userId,
        status: order.status,
        placedAt: order.placedAt || null,
        items,
        updatedAt: order.updatedAt,
        totalItems: items.reduce((count, item) => count + item.quantity, 0),
        totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
    };
};

const emptyCartView = (userId) => ({
    id: null,
    userId,
    status: 'cart',
    items: [],
    totalItems: 0,
    totalAmount: 0,
    updatedAt: null,
});

// Option D - Add meal to cart
router.post('/cart/items', async (req, res) => {
    try {
        const { userId, foodId } = req.body;
        const quantity = Number(req.body.quantity ?? 1);

        if (!userId || !foodId || !Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                success: false,
                error: 'userId, foodId and quantity (>=1) are required.'
            });
        }

        const user = await findUser(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (!user.otpVerified) {
            return res.status(403).json({
                success: false,
                error: 'User must be verified before ordering.'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(404).json({ success: false, error: 'Food item not found.' });
        }

        const food = await Food.findById(foodId);
        if (!food) {
            return res.status(404).json({ success: false, error: 'Food item not found.' });
        }

        if (!food.isAvailable) {
            return res.status(409).json({ success: false, error: 'Food item is unavailable.' });
        }

        let cart = await findActiveCart(user.id);
        if (!cart) {
            const now = new Date().toISOString();
            cart = await Order.create({
                userId: user.id,
                status: 'cart',
                items: [],
                createdAt: now,
                updatedAt: now
            });
        }

        const foodIdString = String(food._id);
        const existing = cart.items.find((item) => item.foodId === foodIdString);

        if (existing) {
            existing.quantity += quantity;
            existing.unitPriceSnapshot = food.price;
            existing.foodNameSnapshot = food.name;
        } else {
            cart.items.push({
                foodId: foodIdString,
                foodNameSnapshot: food.name,
                quantity,
                unitPriceSnapshot: food.price,
                addedAt: new Date().toISOString()
            });
        }

        cart.updatedAt = new Date().toISOString();
        await cart.save();

        return res.status(201).json({
            success: true,
            message: 'Item added to cart.',
            data: toOrderView(cart)
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Option E - View cart
router.get('/cart/:userId', async (req, res) => {
    try {
        const userId = String(req.params.userId).trim();

        const user = await findUser(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        const cart = await findActiveCart(userId);
        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart fetched successfully.',
                data: emptyCartView(userId)
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cart fetched successfully.',
            data: toOrderView(cart)
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Option F - Clear cart
router.delete('/clear-cart/:userId', async (req, res) => {
    try {
        const userId = String(req.params.userId).trim();

        const user = await findUser(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        const cart = await findActiveCart(userId);
        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart cleared successfully.',
                data: { ...emptyCartView(userId), cleared: true }
            });
        }

        cart.items = [];
        cart.updatedAt = new Date().toISOString();
        await cart.save();

        return res.status(200).json({
            success: true,
            message: 'Cart cleared successfully.',
            data: { ...toOrderView(cart), cleared: true }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Option C - Create order from cart
router.post('/orders', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required.' });
        }

        const user = await findUser(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (!user.otpVerified) {
            return res.status(403).json({
                success: false,
                error: 'User must be verified before ordering.'
            });
        }

        const cart = await findActiveCart(user.id);
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, error: 'Cart is empty.' });
        }

        const now = new Date().toISOString();
        cart.status = 'placed';
        cart.placedAt = now;
        cart.updatedAt = now;
        await cart.save();

        return res.status(201).json({
            success: true,
            message: 'Order created successfully.',
            data: toOrderView(cart)
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Option C - Fetch order details & status
router.get('/orders/:id', async (req, res) => {
    try {
        const orderId = String(req.params.id).trim();

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }

        const order = await Order.findById(orderId);
        if (!order || order.status === 'cart') {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Order fetched successfully.',
            data: toOrderView(order)
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;