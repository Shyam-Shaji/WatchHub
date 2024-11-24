const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true,
        unique : true,
    },
    walletBalance : {
        type : Number,
        default : 0,
        min : 0,
    },
    transactions: [
        {
            date: {
                type: Date,
                default: Date.now,
            },
            description: {
                type: String,
                required: true,
            },
            amount: {
                type: Number,
                required: true,
            },
            transactionType: {
                type: String,
                enum: ['Credit', 'Debit'], 
                required: true,
            },
            status: {
                type: String,
                enum: ['Completed', 'Pending', 'Failed'], 
                default: 'Completed',
            },
        },
    ],
})

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;