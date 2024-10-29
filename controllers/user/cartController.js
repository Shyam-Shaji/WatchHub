const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.query.id;

        if (!userId) {
            return res.redirect('/login');
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (productIndex > -1) {
            // If product already exists, update quantity and totalPrice
            cart.items[productIndex].quantity += 1;
            cart.items[productIndex].totalPrice = cart.items[productIndex].price * cart.items[productIndex].quantity;
        } else {
            // If product doesn't exist, add new item
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error("Product not found");
            }

            cart.items.push({
                productId,
                quantity: 1,
                price: product.salePrice, // Or use regularPrice based on your needs
                totalPrice: product.salePrice * 1, // Initialize totalPrice as price * quantity
            });
        }

        await cart.save();
        res.redirect('/cart');
    } catch (error) {
        console.error('Error adding to cart', error);
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

const removeCart = async(req,res)=>{
    try {

        const userId = req.session.user;
        const { productId } = req.body;

        if(!userId){
            return res.redirect('/login');
        }

        let cart = await Cart.findOne({userId});
        if(!cart) return res.redirect('/cart');

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

        res.redirect('/cart');
        
    } catch (error) {
        console.error('Error removing form cart', error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    addToCart,
    viewCart,
    removeCart,
}