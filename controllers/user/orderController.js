const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const path = require('path');
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
        const limit = 10; 
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({ userId })
            .populate('items.product', 'productImage productName')
            .sort({ orderDate: -1 })
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
    console.log('is it working');
    
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

        console.log('checking the it is working or not ');

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
    const userId = req.session.user; 

    try {
        // Validate input
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required',
            });
        }

        // Find the order with validation
        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Check if order is already cancelled
        if (order.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled.',
            });
        }

        // Validate that the order belongs to the user
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to cancel this order',
            });
        }

        // Check if order is cancellable (e.g., not shipped or delivered)
        const nonCancellableStatuses = ['Shipped', 'Delivered'];
        if (nonCancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel order with status ${order.status}`,
            });
        }

        
        const refundAmount = order.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        
        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        await order.save();

       
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({
                userId,
                walletBalance: 0,
                transactions: [],
            });
        }

        // Credit refund to wallet
        wallet.walletBalance += refundAmount;
        wallet.transactions.push({
            date: new Date(),
            description: `Refund for cancelled order ${orderId}`,
            amount: refundAmount,
            transactionType: 'Credit', 
            status: 'Completed', 
        });

        await wallet.save();

        
        const bulkWriteOperations = order.items.map(item => ({
            updateOne: {
                filter: { _id: item.product },
                update: { $inc: { quantity: item.quantity } }
            }
        }));

        if (bulkWriteOperations.length > 0) {
            await Product.bulkWrite(bulkWriteOperations);
        }

        res.json({
            success: true,
            message: 'Order cancelled successfully. Refund credited to wallet.',
            refundAmount,
            walletBalance: wallet.walletBalance,
        });
    } catch (error) {
        console.error('Error cancelling order: ', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while cancelling the order.',
            errorDetails: error.message
        });
    }
};

const cancelOrderItem = async (req, res) => {
    const { orderId, itemId } = req.params;
    const userId = req.session.user;

    try {
        // Find the order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Find the specific item in the order
        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);

        console.log('checking the itemsIndex from the cancelOrderItem controller : ', itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in the order',
            });
        }

        const item = order.items[itemIndex];

        // Check if item is already cancelled
        if (item.itemStatus === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Item is already cancelled',
            });
        }

        // Update item status
        item.itemStatus = 'Cancelled';

        // Calculate refund for this specific item
        const refundAmount = item.price * item.quantity;

        // Update wallet
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
            description: `Refund for cancelled item ${itemId} in order ${orderId}`,
            amount: refundAmount,
            transactionType: 'Credit',
            status: 'Completed',
        });

        await wallet.save();

        // Restore product quantity
        await Product.findByIdAndUpdate(item.product, { 
            $inc: { quantity: item.quantity } 
        });

        // Check if all items are cancelled
        const allItemsCancelled = order.items.every(
            orderItem => orderItem._id.toString() === itemId || orderItem.itemStatus === 'Cancelled'
        );

        if (allItemsCancelled) {
            order.status = 'Cancelled';
        }

        await order.save();

        return res.json({
            success: true,
            message: 'Item cancelled successfully',
            refundAmount,
            walletBalance: wallet.walletBalance,
        });

    } catch (error) {
        console.error('Error cancelling order item:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while cancelling the item',
            errorDetails: error.message
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

const returnOrderItem = async (req, res) => {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    try {
        // Validate input
        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Return reason is required.',
            });
        }

        // Find the order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.',
            });
        }

        // Find the specific item in the order
        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in the order',
            });
        }

        const item = order.items[itemIndex];

        // Check if item is already cancelled or returned
        if (item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned') {
            return res.status(400).json({
                success: false,
                message: `Item is already ${item.itemStatus.toLowerCase()}.`,
            });
        }

        // Update item status
        item.itemStatus = 'Returned';
        item.returnReason = reason;
        item.returnDate = new Date();

        // Check if all items are returned
        const allItemsReturned = order.items.every(
            orderItem => orderItem._id.toString() === itemId || orderItem.itemStatus === 'Returned'
        );

        if (allItemsReturned) {
            order.status = 'Returned';
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Item return request processed successfully.',
        });

    } catch (error) {
        console.error('Error processing return order item:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing the return request.',
        });
    }
};

const getInvoicePage = async(req,res)=>{
    try {

        const user = req.session.user;

        if(!user){
            return res.status(400).send('User session not found');
        }

        const userData = await User.findOne({_id : user});

        if(!userData){
            return res.status(404).send('User not found');
        }

        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('items.product');

        if(!order){
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument();
        

        res.setHeader('Content-Disposition',`attachment; filename=invoice-${orderId}.pdf`);
        res.setHeader('Content-Type','application/pdf');

        doc.pipe(res);

        doc.fontSize(20).text('Invoice',{align : 'center'});
        doc.moveDown();

        doc.fontSize(12).text(`Order ID : ${order._id}`);
        doc.text(`Customer : ${userData.name}`);
        doc.text(`Date: ${order.orderDate.toDateString()}`);

        doc.moveDown();

        doc.fontSize(12).text('product',50, doc.y, {width : 200, continued : true});
        doc.text('Quantity', 300, doc.y, {width : 100, continued :true});
        doc.text('Price',400, doc.y);
        doc.moveDown();

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        order.items.forEach((item)=>{
            doc.text(item.product.productName, 50, doc.y, {width : 200, continued : true});
            doc.text(item.quantity.toString(), 300, doc.y, {width : 100, continued : true});
            doc.text(`${item.product.salePrice}`,400,doc.y);
            doc.moveDown();
        });

        doc.moveDown();
        doc.fontSize(14).text(`Total : $${order.totalAmount}`, {align : 'right'});

        doc.end();

        // res.render('invoice',{user : userData,order});
        
    } catch (error) {
        console.error('Error generating invoice',error);
        res.status(500).send('Internal Server Error');
    }
}

const retryPayment = async (req,res)=>{
    try {
        const {orderId} = req.body;
        const order = await Order.findOne({_id: orderId,status: 'Payment Pending'});
        if(!order){
            return res.status(400).json({success : false,message:'Order not found or already prcessed'});
        }

        const razorpayOrder = await razorpayInstance.orders.create({
            amount : order.totalAmount * 100,
            currency : 'INR',
            receipt : `retry_receipt_${Date.now()}`,
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        return res.json({
            success : true,
            order : razorpayOrder,
            razorpayKeyId : process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Error retrying payment : ',error.message);
        res.status(500).json({success: false,message : 'Internal Server Error'});
    }
};

const verifyRetryPayment = async (req, res) => {
    try {
        // Log all incoming data for debugging
        console.log('Request Params:', req.params);
        console.log('Request Body:', req.body);

        const { orderId } = req.params;
        const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature 
        } = req.body;

        // Comprehensive input validation
        if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required payment details',
                receivedData: { orderId, razorpay_payment_id, razorpay_order_id }
            });
        }

        // Validate Order ID
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid Order ID format' 
            });
        }

        // Find order with matching ID 
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found',
                orderId: orderId
            });
        }

        // Verify Razorpay signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment verification failed. Invalid signature' 
            });
        }

        // Update order status
        order.status = 'Pending';
        order.paymentId = razorpay_payment_id;
        order.razorpayOrderId = razorpay_order_id;
        order.paidAt = new Date();
        await order.save();

        res.status(200).json({ 
            success: true, 
            message: 'Payment verified successfully' 
        });

    } catch (error) {
        console.error('Error verifying retry payment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error',
            errorDetails: error.message 
        });
    }
};


module.exports = {
    viewOrder,
    createOrder,
    orderCancell,
    cancelOrderItem,
    returnOrder,
    returnOrderItem,
    getInvoicePage,
    retryPayment,
    verifyRetryPayment,
};
