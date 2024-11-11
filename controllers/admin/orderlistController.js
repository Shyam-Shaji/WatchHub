const Order = require('../../models/orderSchema');

const orderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 20; // Orders per page
        const skip = (page - 1) * limit;

        // Fetch orders with pagination and populate necessary fields
        const orders = await Order.find()
            .populate('userId', 'name email')
            .populate('items.product')
            .limit(limit)
            .skip(skip);

        // Get total number of orders to calculate total pages
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

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const { page = 1 } = req.query;  // Get the current page from query params

        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // If the order is canceled, redirect to the order list page
        if (status === 'Cancelled') {
            return res.json({ success: true, redirect: `/admin/orderlist?page=${page}` });
        }

        // For other status updates, send a JSON success response
        res.json({ success: true, message: 'Order status updated', order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};




module.exports = {
    orderList,
    updateOrderStatus
};
