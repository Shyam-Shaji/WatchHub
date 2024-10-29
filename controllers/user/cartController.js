const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');

const addToCart = async (req, res) => { 
    try {
        const userId = req.session.user;
        const productId = req.query.id;
        const maxQuantityPerUser = 5; // Define the max quantity allowed per user per product

        if (!userId) return res.redirect('/login');

        let cart = await Cart.findOne({ userId });
        if (!cart) cart = new Cart({ userId, items: [] });

        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        const product = await Product.findById(productId);
        if (!product) throw new Error("Product not found");

        if (productIndex > -1) {
            const currentQuantity = cart.items[productIndex].quantity;

            // Ensure quantity does not exceed stock or per-user max limit
            if (currentQuantity >= product.quantity) {
                return res.status(400).send("Reached max available stock");
            } else if (currentQuantity >= maxQuantityPerUser) {
                return res.status(400).send("Reached max quantity allowed per user");
            } else {
                cart.items[productIndex].quantity += 1;
                cart.items[productIndex].totalPrice = cart.items[productIndex].price * cart.items[productIndex].quantity;
            }
        } else {
            // New item: check stock and per-user limit
            if (1 > product.quantity) {
                return res.status(400).send("Insufficient stock for this product");
            } else if (1 > maxQuantityPerUser) {
                return res.status(400).send("Cannot add more than max quantity per user");
            }

            cart.items.push({
                productId,
                quantity: 1,
                price: product.salePrice,
                totalPrice: product.salePrice,
            });
        }

        await cart.save();
        res.redirect('/cart');
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Server error');
    }
};



const viewCart = async(req,res)=>{
    try {

        const userId = req.session.user;
        if(!userId){
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({userId}).populate('items.productId');
        res.render('cart',{cart});
        
    } catch (error) {
        console.error('Error loading cart',error);
        res.status(500).send('Server error');
    }
};

const removeCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login'); // Redirect if user is not logged in
        }

        const { productId } = req.body; // Get productId from the request body

        // Find the user's cart
        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found." }); // Return an error if cart doesn't exist

        // Remove the item from the cart
        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

        // Respond with success
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, message: "Server error." }); // Return error if an exception occurs
    }
};


const updateQuantity = async (req, res) => {
    const { productId, action } = req.query;
    const userId = req.session.user;

    // Find the user's cart and populate product details
    let cart = await Cart.findOne({ userId }).populate('items.productId');
    const item = cart.items.find(i => i.productId._id.toString() === productId);

    if (item) {
        if (action === 'increase') {
            if (item.quantity < item.productId.quantity) { // Check against available stock
                item.quantity += 1; // Increment the quantity
            } else {
                return res.json({ success: false, message: "Quantity limit reached." });
            }
        } else if (action === 'decrease') {
            if (item.quantity > 1) { // Ensure quantity does not go below 1
                item.quantity -= 1; // Decrement the quantity
            } else {
                return res.json({ success: false, message: "Minimum quantity reached." });
            }
        }

        // Calculate new total price based on updated quantity
        item.totalPrice = item.quantity * item.price; 
        await cart.save(); // Save changes to the cart

        // Respond with updated quantity and subtotal
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