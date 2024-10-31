const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const loadShopPage = async(req,res)=>{
    try {

        const categories = await Category.find({ isListed: true });

        const products = await Product.find({
            isBlocked : false,
            category : {$in: categories.map(category => category._id)},
            quantity : {$gt : 0 }
        });

        return res.render('shopPage', {products, categories});
        
    } catch (error) {
       console.error('Error shop page',error);
       res.status(500).send('Server Error');
    }
}

module.exports = {
    loadShopPage,
}