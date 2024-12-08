const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');

const getOrderDetailPage = async(req,res)=>{
    try {

        const user = req.session.user;
    if(!user){
        return res.redirect('/login');
    }

    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate('items.product');

    if(!order){
        return res.status(404).send('Order not found');
    }

    const userData = await User.findOne({_id : user});

    res.render('orderDetail',{user : userData, order});
        
    } catch (error) {
        console.error('error in order detail page',error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getOrderDetailPage,
}