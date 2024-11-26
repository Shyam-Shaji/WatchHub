const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');
const {Types} = require('mongoose');
const { applyCoupon } = require('./cartController');

const Razorpay = require('razorpay');
require('dotenv').config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const viewOrder = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect('/login');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Number of orders per page
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({ userId })
            .populate('items.product', 'productImage productName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const razorpayOrders = orders.filter(order => order.paymentMethod === 'Razor Pay');

        return res.render('order', {
            orders,
            razorpayOrders,
            user: userData,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.render('order', { orderStatus: 'Failed to load order details', orders: [] });
    }
};




const createOrder = async (req, res) => {
    try {
        const { address, paymentMethod, items, order_id, couponCode } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items provided" });
        }

        // Map items to validate them
        const validatedItems = items.map((item) => ({
            product: item.product,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
        }));

        console.log('checking validate : ',validatedItems);

        // Calculate the total amount
        let totalAmount = 0;
        validatedItems.forEach((item) => {
            totalAmount += item.totalPrice;
        });

        // Apply coupon if available
        let couponApplied = false;
        if (couponCode) {
            const discount = await applyCoupon(couponCode, totalAmount);
            if (discount > 0) {
                totalAmount -= discount;
                couponApplied = true;
            }
        }

        // Save the new order
        const newOrder = new Order({
            userId,
            address,
            paymentMethod,
            items: validatedItems,
            totalAmount,
            couponApplied,
            razorpayOrderId: order_id,
            status: paymentMethod === 'Razor Pay' ? 'Pending' : 'Confirmed',
        });

        await newOrder.save();

        // Update product stock
        for (const item of validatedItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: -item.quantity },
            });
        }

        await Cart.findOneAndDelete({userId : req.session.user })

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            order: newOrder,
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create order. Please try again later.",
        });
    }
};

// const orderCancell = async (req, res) => {
//     const { orderId } = req.params; 

//     try {
//         const order = await Order.findOneAndUpdate(
//             { orderId }, 
//             { status: 'Cancelled' },
//             { new: true }
//         );

//         if (!order) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: 'Order not found' 
//             });
//         }

        
//         for (const item of order.items) {
//             await Product.findByIdAndUpdate(
//                 item.product,
//                 { $inc: { quantity: item.quantity } }
//             );
//         }

//         res.json({
//             success: true,
//             message: 'Order cancelled successfully and product quantities updated.',
//         });
//     } catch (error) {
//         console.error('Error cancelling order: ', error);
//         res.status(500).json({
//             success: false,
//             message: 'An error occurred while cancelling the order.',
//         });
//     }
// };

const orderCancell = async (req, res) => {
    const { orderId } = req.params; 
    const userId = req.session.user; 

    try {
        
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled.',
            });
        }

       
        const refundAmount = order.items.reduce((total, item) => {
            return total + item.price * item.quantity;
        }, 0);

        
        order.status = 'Cancelled';
        await order.save();

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({
                userId,
                walletBalance: 0,
                transactions: [],
            });
        }

       
        wallet.walletBalance += refundAmount;

      
        wallet.transactions.push({
            date: new Date(),
            description: `Refund for cancelled order ${orderId}`,
            amount: refundAmount,
            transactionType: 'Credit', 
            status: 'Completed', 
        });

       
        await wallet.save();

       
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity }, 
            });
        }

        res.json({
            success: true,
            message: 'Order cancelled successfully. Refund credited to wallet.',
            walletBalance: wallet.walletBalance,
        });
    } catch (error) {
        console.error('Error cancelling order: ', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while cancelling the order.',
        });
    }
};

const returnOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        // Validate input
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required.',
            });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Return reason is required.',
            });
        }

        const order = await Order.findOne({ orderId }); 

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.',
            });
        }

        if (order.status === 'Cancelled' || order.status === 'Returned') {
            return res.status(400).json({
                success: false,
                message: `Order is already ${order.status.toLowerCase()}.`,
            });
        }

        
        order.status = 'Returned';
        order.returnReason = reason; 
        order.returnDate = new Date();

        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Order return request processed successfully.',
            order, 
        });
    } catch (error) {
        console.error('Error processing return order:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing the return request.',
        });
    }
};





module.exports = {
    viewOrder,
    createOrder,
    orderCancell,
    returnOrder,
};
