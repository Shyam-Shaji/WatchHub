const Razorpay = require('razorpay'); 
const Order = require('../../models/orderSchema');
const crypto = require('crypto');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const verifyPayment = (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    res.status(200).json({ success: true, message: 'Payment verified successfully' });
};


//remove
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


const getRazorpayKey = (req, res) => {
    const razorpayKey = process.env.RAZORPAY_KEY_ID;

    if (!razorpayKey) {
        return res.status(500).json({ success: false, message: 'Razorpay key is not configured' });
    }

    res.json({ success: true, key: razorpayKey });
};



module.exports = {
    createOrder,
    verifyPayment,
    getRazorpayKey,
}
