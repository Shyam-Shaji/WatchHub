const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

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
        const userData = await User.findOne({_id:user});
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');

        console.log('checking image: ',cart);

        if (!cart || cart.items.length === 0) {
            return res.render('cart', { cart, subtotal: 0, shipping: 0, total: 0, user:userData });
        }

       
        const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        
        const shipping = subtotal > 0 ? 5 : 0; 

        
        const total = subtotal + shipping;

        res.render('cart', { cart, subtotal, shipping, total, user:userData   });
        
    } catch (error) {
        console.error('Error loading cart', error);
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


module.exports = {
    addToCart,
    viewCart,
    removeCart,
    updateQuantity,
}