const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');

const checkoutPage = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }

        let totalAmount = 0;
        const cartItems = cart.items.map(item => {
            const { productId, quantity, totalPrice } = item;
            totalAmount += totalPrice;
            return {
                productId: productId._id,
                productName: productId.productName,
                quantity,
                price: item.price,
                totalPrice,
                productImage: productId.productImage[0]
            };
        });

        const address = await Address.findOne({ userId });
        let addressList = [];
        if (address && address.address.length > 0) {
            addressList = address.address;
        }

        // Store cart details in session for later use in order placement
        req.session.cartItems = cartItems;
        req.session.totalAmount = totalAmount;

        res.render('checkout', {
            user: user,
            cartItems: cartItems,
            totalAmount: totalAmount,
            addressList: addressList,
            showAddAddressButton: addressList.length === 0
        });
    } catch (error) {
        console.error('Error rendering checkout page:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// const placeOrder = async (req, res) => {
//     const { selectedAddress, payment_option } = req.body;
//     const userId = req.session.user;
//     const cartItems = req.session.cartItems; // Get cart items from session
//     const totalAmount = req.session.totalAmount; // Get total amount from session

//     if (!cartItems || cartItems.length === 0) {
//         return res.status(400).json({ success: false, message: 'Cart is empty' });
//     }

//     try {
//         // Map the payment_option to match schema enum values
//         const paymentMethod = payment_option === 'cash_on_delivery' ? 'Cash on Delivery' :
//                              payment_option === 'razor_pay' ? 'Razor Pay' : 'Wallet';

//         // Create and save the order in the database
//         const order = new Order({
//             userId,
//             addressId: selectedAddress,
//             paymentMethod,
//             items: cartItems.map(item => ({
//                 product: item.productId, 
//                 quantity: item.quantity,
//                 price: item.price,
//                 totalPrice: item.totalPrice
//             })),
//             totalAmount,
//             status: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Processing', 
//             orderDate: new Date()
//         });

//         await order.save();

//         // Clear the cart or update it as needed
//         await Cart.findOneAndUpdate({ userId }, { items: [] });

//         // Respond with success message
//         res.json({ success: true });
//     } catch (error) {
//         console.error('Error placing order:', error);
//         res.status(500).json({ success: false, message: 'Order placement failed', error: error.message });
//     }
// };

const placeOrder = async (req, res) => {
    const { selectedAddress, payment_option } = req.body;
    const userId = req.session.user;
    const cartItems = req.session.cartItems;
    const totalAmount = req.session.totalAmount;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    try {
        const paymentMethod = payment_option === 'cash_on_delivery' ? 'Cash on Delivery' :
                             payment_option === 'razor_pay' ? 'Razor Pay' : 'Wallet';

        // Fetch the address details from the Address collection
        const userAddress = await Address.findOne({
            userId: userId,
            "address._id": selectedAddress
        }, { "address.$": 1 });

        if (!userAddress || !userAddress.address.length) {
            return res.status(400).json({ success: false, message: 'Address not found or does not belong to the user' });
        }

        const address = userAddress.address[0]; // Full address details

        // Create the order with full address details
        const order = new Order({
            userId,
            address: {
                addressType: address.addressType,
                name: address.name,
                city: address.city,
                landMark: address.landMark,
                state: address.state,
                pincode: address.pincode,
                phone: address.phone,
                altPhone: address.altPhone,
            },
            paymentMethod,
            items: cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice
            })),
            totalAmount,
            status: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Processing',
            orderDate: new Date(),
            couponApplied: req.session.couponApplied || false,
        });

        await order.save();

        // Update the product stock in an atomic operation
        for (const item of cartItems) {
            console.log(`Updating stock for product ID: ${item.productId}, Quantity: ${item.quantity}`);
            
            const updatedProduct = await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { quantity: -item.quantity } },
                { new: true }
            );

            if (!updatedProduct) {
                console.error(`Failed to find product with ID: ${item.productId}`);
                return res.status(400).json({ success: false, message: 'Product not found for stock update' });
            } else {
                console.log(`Stock updated successfully for product ID: ${item.productId}, New stock: ${updatedProduct.stock}`);
            }
        }

        // Clear the user's cart
        await Cart.findOneAndUpdate({ userId }, { items: [] });

        res.json({ success: true, message: 'Order placed successfully', orderId: order._id });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Error placing order', error: error.message });
    }
};

module.exports = {
    checkoutPage,
    placeOrder,
};
