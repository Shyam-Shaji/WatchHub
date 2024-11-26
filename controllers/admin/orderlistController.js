const Order = require('../../models/orderSchema');

const orderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 20;
        const skip = (page - 1) * limit;

        
        const orders = await Order.find()
            .populate('userId', 'name email')
            .populate('items.product')
            .limit(limit)
            .skip(skip);

        
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('order-list', {
            orders,
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

const returnApprove = async(req,res)=>{
    const orderId = req.params.id;
    try {
        await Order.findByIdAndUpdate(orderId,{ returnStatus: 'Approved' });
        res.redirect('/admin/orderlist');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error approving return');
    }
}




module.exports = {
    orderList,
    updateOrderStatus,
    returnOrderList,
    returnApprove,
};
