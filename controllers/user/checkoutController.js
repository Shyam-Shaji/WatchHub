const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');

const Razorpay = require('razorpay');
require('dotenv').config();
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const checkoutPage = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }

        let totalAmount = 0;
        const cartItems = cart.items.map(item => {
            const { productId, quantity, totalPrice } = item;
            totalAmount += totalPrice;
            return {
                productId: productId._id,
                productName: productId.productName,
                quantity,
                price: item.price,
                totalPrice,
                productImage: productId.productImage[0]
            };
        });

        const address = await Address.findOne({ userId });
        let addressList = [];
        if (address && address.address.length > 0) {
            addressList = address.address;
        }

        // Store cart details in session for later use in order placement
        req.session.cartItems = cartItems;
        req.session.totalAmount = totalAmount;

        res.render('checkout', {
            user: user,
            cartItems: cartItems,
            totalAmount: totalAmount,
            addressList: addressList,
            showAddAddressButton: addressList.length === 0
        });
    } catch (error) {
        console.error('Error rendering checkout page:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// const placeOrder = async (req, res) => {
//     const { selectedAddress, payment_option } = req.body;
//     const userId = req.session.user;
//     const cartItems = req.session.cartItems;
//     const totalAmount = req.session.totalAmount;

//     // Check if cart is empty
//     if (!cartItems || cartItems.length === 0) {
//         return res.status(400).json({ success: false, message: 'Cart is empty' });
//     }

//     try {
//         // Determine payment method based on payment_option ID
//         let paymentMethod;
//         if (payment_option === 'cash_on_delivery') {
//             paymentMethod = 'Cash on Delivery';
//         } else if (payment_option === 'razor_pay') {
//             paymentMethod = 'Razor Pay';
//         } else if (payment_option === 'wallet') {
//             paymentMethod = 'Wallet';
//         } else {
//             return res.status(400).json({ success: false, message: 'Invalid payment option' });
//         }

//         // Retrieve the selected address to verify it belongs to the user
//         const userAddress = await Address.findOne(
//             {
//                 userId: userId,
//                 "address._id": selectedAddress
//             },
//             { "address.$": 1 }
//         );

//         // Check if the address exists and belongs to the user
//         if (!userAddress || !userAddress.address.length) {
//             return res.status(400).json({ success: false, message: 'Address not found or does not belong to the user' });
//         }

//         const address = userAddress.address[0];

//         // Create new order
//         const order = new Order({
//             userId,
//             address: {
//                 addressType: address.addressType,
//                 name: address.name,
//                 city: address.city,
//                 landMark: address.landMark,
//                 state: address.state,
//                 pincode: address.pincode,
//                 phone: address.phone,
//                 altPhone: address.altPhone,
//             },
//             paymentMethod,
//             items: cartItems.map(item => ({
//                 product: item.productId,
//                 quantity: item.quantity,
//                 price: item.price,
//                 totalPrice: item.totalPrice
//             })),
//             totalAmount,
//             status: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Processing',
//             orderDate: new Date(),
//             couponApplied: req.session.couponApplied || false,
//         });

//         // Save order to database
//         await order.save();

//         // Update product stock
//         for (const item of cartItems) {
//             const updatedProduct = await Product.findByIdAndUpdate(
//                 item.productId,
//                 { $inc: { quantity: -item.quantity } },
//                 { new: true }
//             );

//             if (!updatedProduct) {
//                 console.error(`Failed to find product with ID: ${item.productId}`);
//                 return res.status(400).json({ success: false, message: 'Product not found for stock update' });
//             }
//         }

//         // Clear cart and coupon sessions
//         await Cart.findOneAndUpdate({ userId }, { items: [] });
//         req.session.cartItems = [];
//         req.session.couponApplied = false;

//         // Respond with success
//         res.json({ success: true, message: 'Order placed successfully', orderId: order._id });
//     } catch (error) {
//         console.error('Error placing order:', error);
//         res.status(500).json({ success: false, message: 'Failed to place order due to an internal error' });
//     }
// };

const placeOrder = async (req, res) => {
    const { selectedAddress, payment_option } = req.body;
    console.log("check payment option",payment_option);
    const userId = req.session.user;
    const cartItems = req.session.cartItems;
    const totalAmount = req.session.totalAmount;

    // Check if cart is empty
    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    try {
        // Determine payment method
        let paymentMethod;
        if (payment_option === 'cash_on_delivery') {
            paymentMethod = 'Cash on Delivery';
        } else if (payment_option === 'razor_pay') {
            paymentMethod = 'Razor Pay';
        } else if (payment_option === 'wallet') {
            paymentMethod = 'Wallet';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid payment option' });
        }

        // Verify selected address
        const userAddress = await Address.findOne(
            { userId: userId, "address._id": selectedAddress },
            { "address.$": 1 }
        );

        if (!userAddress || !userAddress.address.length) {
            return res.status(400).json({ success: false, message: 'Address not found or does not belong to the user' });
        }

        const address = userAddress.address[0];

        // Prepare order details for Razorpay
        if (paymentMethod === 'Razor Pay') {
            const razorpayOptions = {
                amount: totalAmount * 100, // Convert to paise
                currency: 'INR',
                receipt: `receipt_${Math.random()}`,
            };

            const razorpayOrder = await razorpay.orders.create(razorpayOptions);

            // Return Razorpay order details to client
            return res.json({ 
                success: true, 
                order: razorpayOrder, 
                totalAmount,
                address,
                paymentMethod
            });
        }

        // Continue with Cash on Delivery order creation
        const order = new Order({
            userId,
            address,
            paymentMethod,
            items: cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice
            })),
            totalAmount,
            status: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Processing',
            orderDate: new Date(),
            couponApplied: req.session.couponApplied || false,
        });

        // Save order and update stock
        await order.save();

        for (const item of cartItems) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { quantity: -item.quantity } },
                { new: true }
            );
        }

        // Clear cart and coupon session
        await Cart.findOneAndUpdate({ userId }, { items: [] });
        req.session.cartItems = [];
        req.session.couponApplied = false;

        // Respond with success
        res.json({ success: true, message: 'Order placed successfully', orderId: order._id });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order due to an internal error' });
    }
};

module.exports = {
    checkoutPage,
    placeOrder,
};
