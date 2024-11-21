const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const { applyCoupon } = require('./cartController');

const Razorpay = require('razorpay');
require('dotenv').config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// const viewOrder = async (req, res) => {
//     try {
//         const userId = req.session.user;

//         // Redirect if user is not logged in
//         if (!userId) {
//             return res.redirect('/login');
//         }

//         // Fetch user data
//         const userData = await User.findById(userId);
//         if (!userData) {
//             console.error('User not found:', userId);
//             return res.redirect('/login');
//         }

//         // Fetch and populate orders
//         const orders = await Order.find({ userId: userData._id })
//             .populate('items.product', 'productImage productName')
//             .sort({ createdAt: -1 });

//         if (!orders.length) {
//             console.warn('No orders found for user:', userId);
//         }

//         // Combine all orders (optionally filter by payment method if required)
//         const combinedOrders = [...orders];

//         // Render the orders page
//         return res.render('order', {
//             orders: combinedOrders,
//             user: userData,
//             orderStatus: combinedOrders.length ? 'Orders Loaded' : 'No orders found'
//         });
//     } catch (error) {
//         console.error('Error fetching orders:', error);

//         // Render error page with an appropriate message
//         return res.render('order', {
//             orderStatus: 'Failed to load order details. Please try again later.',
//             orders: []
//         });
//     }
// };

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

        const orders = await Order.find({ userId })
            .populate('items.product', 'productImage productName')
            .sort({ createdAt: -1 });

        const razorpayOrders = orders.filter(order => order.paymentMethod === 'Razor Pay');

        return res.render('order', {
            orders,
            razorpayOrders,
            user: userData,
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






const orderCancell = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status: 'Cancelled' },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: item.quantity } }
            );
        }

        res.json({
            success: true,
            message: 'Order cancelled successfully and product quantities updated.'
        });

    } catch (error) {
        console.error('Error cancelling order: ', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while cancelling the order.'
        });
    }
};


module.exports = {
    viewOrder,
    createOrder,
    orderCancell,
};
