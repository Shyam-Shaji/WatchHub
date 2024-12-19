const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/cuponSchema');

const Razorpay = require('razorpay');
require('dotenv').config();
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
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

        const cart = await Cart.findOne({ userId }).populate('items.productId').lean();
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }

      

        let subtotal = 0;
        const cartItems = cart.items.map(item => {
            const { productId, quantity, totalPrice } = item;
            subtotal += totalPrice;
            return {
                productId: productId._id,
                productName: productId.productName,
                quantity,
                price: item.price,
                totalPrice,
                productImage: productId.productImage[0]
            };
        });

        const shipping = subtotal > 0 ? 5 : 0;
        const discount = cart.discount || 0;
        const totalAmount = subtotal + shipping - discount;

        console.log('checking the shipping : ',shipping);
        console.log('checking cartItems', cartItems);
        console.log('subtotal in checkout page : ',subtotal);
        console.log('discount in checkout page : ',discount);
        console.log('total amount in checkout page : ',totalAmount);

        const address = await Address.findOne({ userId });
        let addressList = [];
        if (address && address.address.length > 0) {
            addressList = address.address;
        }

        res.render('checkout', {
            user: user,
            cartId: cart._id,
            cartItems: cartItems,
            subtotal: subtotal,
            shipping: shipping,
            discount : discount,
            totalAmount : totalAmount,
            addressList: addressList,
            showAddAddressButton: addressList.length === 0
        });
    } catch (error) {
        console.error('Error rendering checkout page:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const placeOrder = async (req, res) => {
    try {
        const { selectedAddress, payment_option } = req.body;
        console.log('checking the payment option wallet : ',req.body);
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if( !payment_option || !selectedAddress ){
            console.log('validating cartId payemtoption selectedaddress',payment_option,selectedAddress)
            return res.status(401).json({success: false, message:"Not found"});
        }

        

        let paymentMethod;
        switch (payment_option) {
            case 'cash_on_delivery':
                paymentMethod = 'Cash on Delivery';
                break;
            case 'razor_pay':
                paymentMethod = 'Razor Pay';
                break;
            case 'wallet':
                paymentMethod = 'Wallet';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid payment option' });
        }

        const userAddress = await Address.findOne(
            { userId, "address._id": selectedAddress },
            { "address.$": 1 }
        );

        if (!userAddress || !userAddress.address || userAddress.address.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid address' });
        }

        const address = userAddress.address[0];

        const userCart = await Cart.findOne({userId : req.session.user })


        if (!userCart) {
            return res.status(400).json({ success: false, message: 'Cart not found' });
        }
        console.log('user cart: ', userCart);

        const productIds = userCart.items.map(item => item.productId);
        const products = await Product.find({_id : {$in : productIds}});

        const blockedProducts = products.filter(product => product.isBlocked);
        if(blockedProducts.length > 0){
            return res.status(400).json({
                success : false,
                message : "Some products in your cart are blocked and cannot be purchased.",
                blockedProducts : blockedProducts.map(product => product.name)
            });
        }

        const item = userCart.items.map((item)=> ({
            product : item.productId,
            quantity : item.quantity,
            price : item.price,
            totalPrice : item.totalPrice,
        }))
        console.log('items log ', item);

        let subtotal = userCart.items.reduce((sum,item)=> sum + item.totalPrice,0);

        const discount = userCart.discount || 0;
        const totalAmount = subtotal - discount;

        console.log('subtotal form the placeOrder : ',subtotal);
        console.log('discount form the placeOrder : ',discount);
        console.log('total amount after discount : ',totalAmount);

        

        if(paymentMethod === 'Cash on Delivery' && totalAmount > 10000){
            return res.status(400).json({
                success : false,
                message : 'Cash on Delivery is not available for order above ₹10,000.'
            })
        }

        if (paymentMethod === 'Razor Pay') {
            try {
                const razorpayOrder = await razorpayInstance.orders.create({
                    amount: totalAmount * 100, 
                    currency: 'INR',
                    receipt: `receipt_${Date.now()}`,
                });

                const pendingOrder = new Order({
                    userId,
                    address,
                    paymentMethod,
                    items : item,
                    totalAmount,
                    discount,
                    status : "Payment Pending",
                    orderDate : new Date(),
                    razorpayOrderId : razorpayOrder.id,
                });

                await pendingOrder.save();
                await Cart.updateOne({ userId }, { $set: { items: [] } });
                return res.json({
                    success: true,
                    order: razorpayOrder,
                    razorpayKeyId : process.env.RAZORPAY_KEY_ID,
                    address,
                    paymentMethod,
                    items : item,
                    couponCode: req.body.couponCode || null,
                    subtotal,
                    discount,
                    totalAmount,
                    orderId : pendingOrder._id,
                });
            } catch (razorPayError) {
                console.error('Razorpay error:', razorPayError.message);
                return res.status(500).json({ success: false, message: 'Payment processing error' });
            }
        }

        if (paymentMethod === 'Wallet') {
            try {
                // Fetch the user's wallet balance
                const userWallet = await Wallet.findOne( {userId} );

                console.log('checking the user wallet : ', userWallet);
        
                if (!userWallet || userWallet.balance < totalAmount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient wallet balance',
                    });
                }
        
                // Deduct the totalAmount from the wallet balance
                userWallet.balance -= totalAmount;
                await userWallet.save();
        
                // Create the order
                const walletOrder = new Order({
                    userId,
                    address,
                    paymentMethod,
                    items: item,
                    totalAmount,
                    discount,
                    status: 'Pending',
                    orderDate: new Date(),
                });
        
                await walletOrder.save();
        
                // Clear the cart after a successful order
                await Cart.updateOne({ userId }, { $set: { items: [] } });
        
                return res.json({
                    success: true,
                    message: 'Order placed successfully using wallet',
                    orderId: walletOrder._id,
                    subtotal,
                    discount,
                    totalAmount,
                    walletBalance: userWallet.balance,
                });
            } catch (walletError) {
                console.error('Wallet payment error:', walletError.message);
                return res.status(500).json({ success: false, message: 'Wallet payment processing error' });
            }
        }
        

        const order = new Order({
            userId,
            address,
            paymentMethod,
            items: item,
            totalAmount,
            discount,
            status: 'Pending',
            orderDate: new Date(),
        });
        await order.save();

        console.log('Order created:', order);

        await Cart.updateOne({ userId }, { $set: { items: [] } });

        return res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id,
            subtotal,
            discount,
            totalAmount,
        });
    } catch (error) {
        console.error('Error placing order:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};




module.exports = {
    checkoutPage,
    placeOrder,
};
