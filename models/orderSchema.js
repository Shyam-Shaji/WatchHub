const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    address: {
        addressType: String,
        name: String,
        city: String,
        landMark: String,
        state: String,
        pincode: Number,
        phone: String,
        altPhone: String,
    },
    paymentMethod: {
        type: String,
        enum: ['Razor Pay', 'Cash on Delivery', 'Wallet'],
        required: true,
    },
    items: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        itemStatus : {
            type : String,
            enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Request", "Returned", "Completed","Return Approved", "Payment Pending"],
            default : "Pending",
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Request", "Returned", "Completed","Return Approved", "Payment Pending"],
        default: "Pending",
    },
    returnStatus: { // Global return status for the order
        type: String,
        enum: ["Not Requested", "Requested", "Approved", "Rejected"],
        default: "Not Requested",
    },
    couponApplied: {
        type: Boolean,
        default: false,
    }
});


const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
