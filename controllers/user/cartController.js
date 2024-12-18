const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Coupon = require('../../models/cuponSchema');


const addToCart = async (req, res) => {  
    try {
        const userId = req.session.user;
        const productId = req.query.id;
        const maxQuantityPerUser = 5; 

        if (!userId) return res.status(401).json({ message: 'Please log in to add items to your cart.' });

        let cart = await Cart.findOne({ userId });
        if (!cart) cart = new Cart({ userId, items: [], discount: 0, totalPrice: 0 });

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

        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        cart.discount = 0;
        cart.appliedCoupon = null;

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
        const coupon = await Coupon.find({ isList
            : true }); // Fetch active coupons
            console.log('checking the coupon in view cart controller : ', coupon);
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.render('cart', { cart: null, subtotal: 0, shipping: 0, total: 0, user: userData, coupon, discount : 0, appliedCoupon : null });
        }

        const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const shipping = subtotal > 0 ? 5 : 0;
        const discount = cart.discount || 0;
        const total = subtotal + shipping - discount;

        let appliedCoupon = null;
        if (cart.appliedCoupon) {
            appliedCoupon = await Coupon.findById(cart.appliedCoupon).lean();
        }

        console.log('checking the applied coupon in the view cart : ',appliedCoupon);

        res.render('cart', { cart, subtotal, shipping, total, user: userData, coupon, discount, appliedCoupon});
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

   
    try {
        let cart = await Cart.findOne({ userId }).populate('items.productId');
        const item = cart.items.find(i => i.productId._id.toString() === productId);

        if (item) {
            if (action === 'increase') {
                if (item.quantity < item.productId.quantity) { 
                    item.quantity += 1;
                } else {
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
            cart.totalPrice = cart.items.reduce((acc, i) => acc + i.totalPrice, 0);
            cart.discount = 0;
            cart.appliedCoupon = null;

            await cart.save();

            res.json({ success: true, newQuantity: item.quantity, newSubtotal: item.totalPrice, newTotal: cart.totalPrice });
        } else {
            res.json({ success: false, message: "Item not found in cart." });
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

const getCoupon = async (req, res) => {
    try {
        
        const coupons = await Coupon.find({
            isList: true, 
            expireOn: { $gte: new Date() }, 
        });

        
        console.log('Fetched coupons:', coupons);

       
        if (!coupons || coupons.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active coupons available.",
            });
        }

        
        res.status(200).json({
            success: true,
            coupons,
        });
    } catch (error) {
       
        console.error("Error fetching coupons:", error.message);

        
        res.status(500).json({
            success: false,
            message: "Failed to fetch coupons. Please try again later.",
        });
    }
};

const couponStatus = async(req,res)=>{
    try {
        if(req.session.appliedCoupon){
            res.json({appliedCoupon : req.session.appliedCoupon});
        }else {
            res.json({appliedCoupon : null});
        }
    } catch (error) {
        console.error('couponStatus error: ',error);
        res.status(500).json({success : false,message : "Failed to coupon status"});
    }
}

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        console.log('Coupon from the req body:', couponCode);

        
        if (!couponCode) {
            return res.status(400).json({ success: false, message: "Coupon code is required." });
        }

       
        const coupon = await Coupon.findOne({
            name: couponCode,
            isList: true, 
            expireOn: { $gte: new Date() }, 
        });

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Invalid or expired coupon." });
        }

        console.log('Coupon found:', coupon); 

        
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "User not logged in. Please log in and try again." });
        }

        console.log('User session data:', user);


        
        const cart = await Cart.findOne({ userId: user });
        if (!cart) {
            console.log('No cart found for user ID:', user);
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        console.log('Cart data found:', cart); 

       
        if (cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }

       
        const cartTotalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        console.log('Calculated cart total price:', cartTotalPrice); 

        
        if (isNaN(coupon.offerPrice) || isNaN(cartTotalPrice)) {
            console.log('Invalid coupon offerPrice or cart total price');
            return res.status(400).json({
                success: false,
                message: "Invalid coupon or cart total price.",
            });
        }

        if(cartTotalPrice < coupon.minimumPrice){
            return res.status(400).json({
                success : false,
                message: `Minimum purchase of ₹${coupon.minimumPrice
                } is required to apply this coupon.`,
            })
        }

      
        const discount = Math.min(coupon.offerPrice, cartTotalPrice);
        
        console.log('checking the discount in the cart after coupon applied',discount);
        if (discount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Coupon discount is not applicable.",
            });
        }

       
        cart.discount = discount;
        cart.totalPrice = cartTotalPrice - discount; 
        cart.appliedCoupon = coupon._id;

        
        await cart.save();

        req.session.appliedCoupon = coupon.name;

       return res.status(200).json({
            success: true,
            discount : cart.discount,
            newTotalPrice: cart.totalPrice,
            message: `Coupon applied successfully! You saved ₹${discount}.`,
        });
    } catch (error) {
        console.error('Error applying coupon:', error.message);
        return res.status(500).json({ success: false, message: "Failed to apply coupon. Please try again later." });
    }
};

const removeCoupon = async(req,res)=>{
    try {

        const user = req.session.user;
        if(!user){
            return res.status(401).json({success: false, message : "User not logged in. Please log in and try again."});
        }

        const cart = await Cart.findOne({userId: user});
        if(!cart){
            return res.status(404).json({success: false,message: 'Cart not found.' });
        }

        cart.discount = 0;
        cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        cart.appliedCoupon = null;
        await cart.save();

        req.session.appliedCoupon = null;

        res.status(200).json({
            success : true,
            message : "Coupon removed successfully.",
            newTotalPrice : cart.totalPrice,
        });
        
    } catch (error) {
        console.error('Error removing coupon : ', error.message);
        res.status(500).json({success: false, message: "Failed to removing the coupon. Please try again later"});
    }
}


module.exports = {
    addToCart,
    viewCart,
    removeCart,
    updateQuantity,
    getCoupon,
    couponStatus,
    applyCoupon,
    removeCoupon,
}