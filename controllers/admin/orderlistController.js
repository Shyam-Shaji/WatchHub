const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema')

const orderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10;
        const skip = (page - 1) * limit;

        
        const orders = await Order.find()
            .populate('userId', 'name email')
            .populate('items.product','productName')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

            const formattedOrders = orders.map(order => {
                return {
                    ...order.toObject(),
                    items: order.items.map(item => ({
                        productId: item.product._id,
                        productName: item.product.productName,
                        quantity: item.quantity,
                        price: item.price
                    }))
                };
            });

        
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('order-list', {
            orders : formattedOrders,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.render('order-list', { orders: [], error: 'Failed to load orders' });
    }
};


// const updateOrderStatus = async (req, res) => {
//     try {
//         const { orderId } = req.params;
//         const { status } = req.body;
//         const { page = 1 } = req.query;  // Get the current page from query params

//         const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         // If the order is cancelled, provide a redirect URL
//         if (status === 'Cancelled') {
//             return res.redirect('/admin/orderlist');
//         }

//         // For other status updates, send a JSON success response
//         res.json({ success: true, message: 'Order status updated', order });
//     } catch (error) {
//         console.error('Error updating order status:', error);
//         res.status(500).json({ success: false, message: 'Failed to update order status' });
//     }
// };

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required.',
            });
        }

       
        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.',
            });
        }

        res.json({
            success: true,
            message: `Order status updated to ${status}.`,
            order,
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status.',
        });
    }

};

const returnOrderList = async(req,res)=>{
    
    try {

        const returnedOrders = await Order.find({returnedStatus:{$in:['Requested', 'Approved']}});
        res.render('return-orders',{
            orders: returnedOrders,
            currentPage: req.query.page || 1,
            totalPages: Math.ceil(returnedOrders.length / 10),
        })
        
    } catch (error) {
        console.error('Error fetching return order: ',error);
        res.status(500).send('Internel server error');
    }
}

const returnApprove = async (req, res) => {
    const { id } = req.params;

    try {
        // console.log('ajsdfjlkdjflkj chekint return approve ',id);
        // Fetch the order details
        const order = await Order.findOne({ _id:id });
        console.log(order)
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Check if the return is already approved
        if (order.returnStatus === 'Return Approved') {
            return res.status(400).json({
                success: false,
                message: 'Return is already approved.',
            });
        }

        // Check if the payment method is Razorpay
        if (order.paymentMethod !== 'Razor Pay') {
            return res.status(400).json({
                success: false,
                message: 'Return can only be approved for Razorpay payments.',
            });
        }

        // Calculate refund amount (assuming return items are a subset of order items)
        const refundAmount = order.items.reduce((total, item) => {
            return total + item.price * item.quantity;
        }, 0);

        console.log('checking amoutn : ', refundAmount);

        // Update order's return status
        order.returnStatus = 'Approved';
        await order.save();

        // Find or create wallet for the user
        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
            wallet = await Wallet.create({
                userId: order.userId,
                walletBalance: 0,
                transactions: [],
            });
        }

        // Credit refund amount to the user's wallet
        wallet.walletBalance += refundAmount;

        // Log the transaction in the wallet
        wallet.transactions.push({
            date: new Date(),
            description: `Refund for returned order ${id}`,
            amount: refundAmount,
            transactionType: 'Credit',
            status: 'Completed',
        });

        // Save the wallet updates
        await wallet.save();

        // Adjust stock for the returned items
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity },
            });
        }

        res.json({
            success: true,
            message: 'Return approved successfully. Refund credited to wallet.',
            walletBalance: wallet.walletBalance,
        });
    } catch (error) {
        console.error('Error approving return: ', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while approving the return.',
        });
    }
};






module.exports = {
    orderList,
    updateOrderStatus,
    returnOrderList,
    returnApprove,
};
