const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Coupon = require('../../models/cuponSchema');


const addToCart = async (req, res) => {  
    try {
        const userId = req.session.user;
        const productId = req.query.id;
        const maxQuantityPerUser = 5; // Define the max quantity allowed per user per product

        if (!userId) return res.status(401).json({ message: 'Please log in to add items to your cart.' });

        let cart = await Cart.findOne({ userId });
        if (!cart) cart = new Cart({ userId, items: [] });

        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        const product = await Product.findById(productId);
        if (!product) throw new Error("Product not found");

        if (productIndex > -1) {
            const currentQuantity = cart.items[productIndex].quantity;

            // Ensure quantity does not exceed stock or per-user max limit
            if (currentQuantity >= product.quantity) {
                return res.status(400).json({ message: "Reached max available stock" });
            } else if (currentQuantity >= maxQuantityPerUser) {
                return res.status(400).json({ message: "Reached max quantity allowed per user" });
            } else {
                cart.items[productIndex].quantity += 1;
                cart.items[productIndex].totalPrice = cart.items[productIndex].price * cart.items[productIndex].quantity;
            }
        } else {
            // New item: check stock and per-user limit
            if (1 > product.quantity) {
                return res.status(400).json({ message: "Insufficient stock for this product" });
            } else if (1 > maxQuantityPerUser) {
                return res.status(400).json({ message: "Cannot add more than max quantity per user" });
            }

            cart.items.push({
                productId,
                quantity: 1,
                price: product.salePrice,
                totalPrice: product.salePrice,
            });
        }

        await cart.save();
        res.status(200).json({ message: 'Product added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 




const viewCart = async (req, res) => {
    try {
        const user = req.session.user;

        if (!user) {
            return res.redirect('/login');
        }

        const userData = await User.findOne({ _id: user });
        const coupon = await Coupon.find({ isActive: true }); // Fetch active coupons
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.render('cart', { cart: null, subtotal: 0, shipping: 0, total: 0, user: userData, coupon });
        }

        const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const shipping = subtotal > 0 ? 5 : 0;
        const total = subtotal + shipping;

        res.render('cart', { cart, subtotal, shipping, total, user: userData, coupon });
    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).send('Server error');
    }
};



const removeCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login'); 
        }

        const { productId } = req.body; 

       
        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found." });

        
        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

       
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};


const updateQuantity = async (req, res) => {
    const { productId, action } = req.query;
    const userId = req.session.user;

   
    let cart = await Cart.findOne({ userId }).populate('items.productId');
    const item = cart.items.find(i => i.productId._id.toString() === productId);
    console.log('product;',item.productId)
    if (item) {
        if (action === 'increase') {
            if (item.quantity < item.productId.quantity) { 
                item.quantity += 1;
                console.log('itemquantity:',item.quantity, 'itemproductquantitys',item.productId.quantity)
            } else {
                console.log('respose increase error working')
                return res.json({ success: false, message: "Quantity limit reached." });
            }
        } else if (action === 'decrease') {
            if (item.quantity > 1) { 
                item.quantity -= 1; 
            } else {
                return res.json({ success: false, message: "Minimum quantity reached." });
            }
        }

       
        item.totalPrice = item.quantity * item.price; 
        await cart.save(); 

        
        res.json({ success: true, newQuantity: item.quantity, newSubtotal: item.totalPrice });
    } else {
        res.json({ success: false, message: "Item not found in cart." });
    }
};

const getCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find({
            isList: true,
            expireOn: { $gte: new Date() },
        });
        console.log('checking coupons: ',coupons);

        if (!coupons || coupons.length === 0) {
            return res.status(404).json({ success: false, message: "No active coupons available." });
        }

        res.status(200).json({ success: true, coupons });
    } catch (error) {
        console.error("Error fetching coupons:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch coupons. Please try again later." });
    }
};



// const applyCoupon = async (req, res) => {
//     try {
//         const { couponCode } = req.body;

//         // Fetch the coupon
//         const coupon = await Coupon.findOne({ code: couponCode, isList: true });
//         if (!coupon) {
//             return res.json({ success: false, message: "Invalid or expired coupon." });
//         }

//         const user = req.session.user;
//         const cart = await Cart.findOne({ userId: user });

//         if (!cart) {
//             return res.json({ success: false, message: "Cart not found." });
//         }

//         // Validate minimum price
//         if (cart.totalPrice < coupon.minimumPrice) {
//             return res.json({
//                 success: false,
//                 message: `Coupon can only be applied for orders above ${coupon.minimumPrice}.`
//             });
//         }

//         // Apply discount
//         const discount = Math.min(coupon.offerPrice, cart.totalPrice); // Avoid negative total
//         cart.discount = discount;
//         cart.totalPrice -= discount;
//         await cart.save();

//         res.json({ success: true, discount: discount });
//     } catch (error) {
//         console.error("Error applying coupon: ", error);
//         res.status(500).json({ success: false, message: "Failed to apply coupon." });
//     }
// };

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        console.log('Coupon from the req body:', couponCode);

        // Validate input
        if (!couponCode) {
            return res.status(400).json({ success: false, message: "Coupon code is required." });
        }

        // Find the coupon by code, ensure it is valid
        const coupon = await Coupon.findOne({
            name: couponCode,
            isList: true, // Check if the coupon is listed
            expireOn: { $gte: new Date() }, // Check if the coupon is not expired
        });

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Invalid or expired coupon." });
        }

        console.log('Coupon found:', coupon); // Debugging log to check coupon details

        // Get user session and verify user is logged in
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "User not logged in. Please log in and try again." });
        }

        console.log('User session data:', user);

        // Ensure the user._id exists before querying the cart
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid user data." });
        }

        // Find the user's cart by userId
        const cart = await Cart.findOne({ userId: user });
        if (!cart) {
            console.log('No cart found for user ID:', user);
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        console.log('Cart data found:', cart); // Debugging log to check cart details

        // Check if the cart contains items
        if (cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }

        // Get the total price from the cart items
        const cartTotalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        console.log('Calculated cart total price:', cartTotalPrice); // Debugging log for cart total

        // Ensure the coupon.offerPrice and cartTotalPrice are valid numbers
        if (isNaN(coupon.offerPrice) || isNaN(cartTotalPrice)) {
            console.log('Invalid coupon offerPrice or cart total price');
            return res.status(400).json({
                success: false,
                message: "Invalid coupon or cart total price.",
            });
        }

        // Skip checking for minimum price (allowing coupons on smaller orders)
        // Calculate the discount
        const discount = Math.min(coupon.offerPrice, cartTotalPrice);
        if (discount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Coupon discount is not applicable.",
            });
        }

        // Update cart with discount
        cart.discount = discount;
        cart.totalPrice = cartTotalPrice - discount; // Update the totalPrice after discount

        // Save the updated cart
        await cart.save();

        res.status(200).json({
            success: true,
            discount,
            newTotalPrice: cart.totalPrice,
            message: `Coupon applied successfully! You saved ₹${discount}.`,
        });
    } catch (error) {
        console.error('Error applying coupon:', error.message);
        res.status(500).json({ success: false, message: "Failed to apply coupon. Please try again later." });
    }
};


module.exports = {
    addToCart,
    viewCart,
    removeCart,
    updateQuantity,
    getCoupon,
    applyCoupon,
}