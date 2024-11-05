const Order = require('../../models/orderSchema');

const viewOrder = async (req, res) => {
    try {
        const userId = req.session.user; // Assuming user ID is stored in the session
        // const { orderId } = req.params; // Get the orderId from the request parameters

        console.log('User ID:', userId); // Log the user ID for debugging
        // console.log('Order ID:', orderId); // Log the order ID for debugging

        if (!userId) {
            return res.redirect('/login'); // Redirect to login if user is not authenticated
        }

        // Fetch the order details for the specified orderId and userId
        const order = await Order.findOne({  userId:userId })
            // Populate product details
            

        console.log('Checking order details:', order); // Log order details for debugging

        // If the order is not found, set the order to null and status message
        let orderStatus = 'Order found'; // Default to found
        if (!order) {
            orderStatus = 'Order not found'; // Update status if order is not found
        }

        // // Calculate the subtotal for the order if it exists
        // let subtotal = 0;
        // let shipping = 5; // Example fixed shipping cost
        // let total = 0;

        // if (order) {
        //     subtotal = order.items.reduce((acc, item) => {
        //         return acc + (item.productId.price * item.quantity); // Use product price from populated data
        //     }, 0);
        //     total = subtotal + shipping; // Calculate total
        // }

        // Render the order view with the order details and calculated values
       return res.render('order', { order });
        
    } catch (error) {
        console.error('Error in order page:', error); // Log error for debugging
        // Handle any other errors gracefully
        res.render('order', { orderStatus: 'Failed to load order details', order: null }); // Indicate loading failure
    }
};


module.exports = {
    viewOrder,
};
