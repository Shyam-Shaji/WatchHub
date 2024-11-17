const Razorpay = require('razorpay'); 
const Order = require('../../models/orderSchema');
const crypto = require('crypto');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
    const { amount } = req.body;
    try {
        const options = { 
            amount: amount * 100, 
            currency: 'INR', 
            receipt: `receipt_${Math.random()}`,
        };

        const Order = await razorpay.orders.create(options); 
        res.json({ success: true, Order });
    } catch (error) {
        console.error("Error creating Razorpay order: ", error);
        res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
    }
};

const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET); 
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
        res.json({ success: true, message: "Payment verified successfully" }); 
    } else {
        res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
};

// Endpoint to send Razorpay key to the client-side securely
const getRazorpayKey = (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
};

module.exports = {
    createOrder,
    verifyPayment,
    getRazorpayKey,
}
