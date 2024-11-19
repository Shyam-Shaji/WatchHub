const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const { applyCoupon } = require('./cartController');

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
        const { address, paymentMethod, items, couponCode } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const validatedItems = [];
        let totalAmount = 0;

        // Validate cart items and calculate total amount
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
            }
            if (item.quantity > product.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product: ${product.productName}`,
                });
            }

            const itemTotalPrice = item.quantity * product.price;
            validatedItems.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price,
                totalPrice: itemTotalPrice,
            });

            totalAmount += itemTotalPrice;
        }

        // Apply coupon if available
        let couponApplied = false;
        if (couponCode) {
            const discount = await applyCoupon(couponCode, totalAmount);
            if (discount > 0) {
                totalAmount -= discount;
                couponApplied = true;
            }
        }

        // Razorpay Order ID creation
        let razorpayOrderId = null;
        if (paymentMethod === 'Razor Pay') {
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: totalAmount * 100, // Convert to paise
                currency: 'INR',
                receipt: `order_rcptid_${Date.now()}`,
            });

            razorpayOrderId = razorpayOrder.id;
        }

        // Save the new order
        const newOrder = new Order({
            userId,
            address,
            paymentMethod,
            items: validatedItems,
            totalAmount,
            couponApplied,
            razorpayOrderId,
            status: paymentMethod === 'Razor Pay' ? 'Pending' : 'Confirmed',
        });

        await newOrder.save();

        // Update product stock
        for (const item of validatedItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: -item.quantity },
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: newOrder,
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order. Please try again later.',
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
