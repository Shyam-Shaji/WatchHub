const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema');

const checkoutPage = async(req,res)=>{
    try {

        const userId = req.session.user;

        if(!userId){
            return res.redirect('/login');
        }

        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({message: "User not found"})
        }

        const cart = await Cart.findOne({userId}).populate('items.productId');

        if(!cart || cart.items.length === 0){
            return res.status(400).json({message: "Your cart is empty"});
        }

        let totalAmount = 0;

        const cartItems = cart.items.map(item => {
            const {productId, quantity, price, totalPrice} = item;
            totalAmount += totalPrice;
            return {
                productId: productId._id,
                productName: productId.productName,
                quantity,
                price,
                totalPrice,
                productImage: productId.productImage[0]
            };
        });

        const address = await Address.findOne({userId});
        if(!address || address.address.length === 0){
            return res.status(400).json({message: "No address found. Please add an address to proceed."});
        }

        res.render('checkout',{
            user: user,
            cartItems: cartItems,
            totalAmount: totalAmount,
            addressList: address.address
        });
        
    } catch (error) {
        console.error('Error rendering checkout page: ',error);
        res.status(500).json({message:"Internal Server Error"});
    }
}

module.exports = {
    checkoutPage,
}