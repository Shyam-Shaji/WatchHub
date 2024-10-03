const mongoose = require('mongoose');
const {Schema} = mongoose;

const cuponSchema = new Schema({
    name : {
        type : String,
        required : true,
        unique : true,
    },
    createOn : {
        type : Date,
        default : Date.now(),
        required : true,
    },
    expireOn : {
        type : Date,
        required : true,
    },
    offerPrice : {
        type : Number,
        required : true,
    },
    minimumPrice : {
        type : Number,
        required : true,
    },
    isList : {
        type : Boolean,
        default : true,
    },
    userId : {
        type : Schema.Types.ObjectId,
        ref : 'User',
    }
})

const Cupon = mongoose.model("Cupon",cuponSchema);

module.exports = Cupon;