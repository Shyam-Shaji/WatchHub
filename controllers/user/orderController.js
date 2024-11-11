const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema')

const viewOrder = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id: user});
        const userId = req.session.user; 
        

        if (!userId) {
            return res.redirect('/login'); 
        }

        
        const orders = await Order.find({ userId: userId }).populate('items.product','name image'); 

        console.log('Order details for user:', orders); 

       
        return res.render('order', { orders, user : userData });

    } catch (error) {
        console.error('Error in order page:', error); 
       
        res.render('order', { orderStatus: 'Failed to load order details', orders: [] }); 
    }
};

const orderCancell = async (req, res) => {
    const { orderId } = req.params;
    try {
        
        const order = await Order.findOneAndUpdate(
            { orderId: orderId },
            { status: 'Cancelled' },
            { new: true }
        );

        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }
        // console.log(order)
        // return
        // Retrieve the products from the order and update their quantities
        for (const item of order.items) {
            // console.log(item)
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: item.quantity } }
            );
        }

        res.json({ success: true, message: 'Order cancelled successfully and product quantities updated.' });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'An error occurred while cancelling the order.' });
    }
};

module.exports = {
    viewOrder,
    orderCancell,
};
