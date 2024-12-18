const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');

const loadShopPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user }).lean();
        
        
        const sortOption = req.query.sort || 'newArrivals';
        const categories = await Category.find({ isListed: true }).lean();
        
       
        let sortCriteria;
        switch (sortOption) {
            case 'priceLowHigh':
                sortCriteria = { salePrice: 1 }; 
                break;
            case 'priceHighLow':
                sortCriteria = { salePrice: -1 }; 
                break;
            case 'nameAZ':
                sortCriteria = { productName: 1 }; 
                break;
            case 'nameZA':
                sortCriteria = { productName: -1 };
                break;
            case 'newArrivals':
            default:
                sortCriteria = { createdAt: -1 };
        }

       
        const page = parseInt(req.query.page) || 1;
        const limit = 12;

        
        const products = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
        .sort(sortCriteria)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

       
        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        });
        const totalPages = Math.ceil(totalProducts / limit);

       
        return res.render('shopPage', {
            user: userData,
            products,
            categories,
            currentPage: page,
            totalPages,
            sortOption,
        });

    } catch (error) {
        console.error('Error loading shop page:', error);
        res.status(500).send('Server Error');
    }
};


module.exports = {
    loadShopPage,
}