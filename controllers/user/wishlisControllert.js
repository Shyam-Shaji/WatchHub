const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

const wishlistPage = async (req, res) => { 
    try {
        const user = req.session.user;
        const userData = await User.findById(user);
        
        const wishlist = await Wishlist.findOne({ userId: user }).populate('products.productId', 'name salePrice productImage quantity productName'); 
        res.render('wishlist', { user: userData, wishlist: wishlist ? wishlist.products : [] });
    } catch (error) {
        console.log('Error in rendering the wishlist:', error);
    }
};


const addToWishlist = async (req, res) => {
    try {
        const productId = req.query.id; 
        const userId = req.session.user;

        
        if (!userId) {
            return res.status(401).json({ message: 'Please log in to add items to your wishlist.' });
        }

        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        
        const isProductInWishlist = wishlist.products.some(item => item.productId.toString() === productId);
        
        if (isProductInWishlist) {
            return res.json({ message: "Product is already in your wishlist" });
        }

        
        wishlist.products.push({ productId });
        console.log('products to the wishlist : ', wishlist);
        await wishlist.save();

        
        res.redirect('/wishlistPage');
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.status(500).json({ message: "An error occurred while adding the product to the wishlist" });
    }
}

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.params.id;
        
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please log in to manage your wishlist.' });
        }

        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found.' });
        }

        wishlist.products = wishlist.products.filter((item) => item.productId.toString() !== productId);
        await wishlist.save();

        res.json({ success: true, message: 'Product removed from wishlist.' });
    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        res.status(500).json({ success: false, message: 'An error occurred while removing the product from the wishlist.' });
    }
};


module.exports = {
    wishlistPage,
    addToWishlist,
    removeFromWishlist,
};
