const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');

const loadShopPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id: user});
        // Retrieve the sorting option from query parameters (default to 'featured' if none provided)
        const sortOption = req.query.sort || 'featured';
        const categories = await Category.find({ isListed: true });
        
        // Prepare the sorting criteria based on the selected option
        let sortCriteria;
        switch (sortOption) {
            case 'priceLowHigh':
                sortCriteria = { salePrice: 1 }; // Ascending order
                break;
            case 'priceHighLow':
                sortCriteria = { salePrice: -1 }; // Descending order
                break;
            case 'nameAZ':
                sortCriteria = { productName: 1 }; // Alphabetical order
                break;
            case 'nameZA':
                sortCriteria = { productName: -1 }; // Reverse alphabetical
                break;
            default:
                sortCriteria = {}; // Default sorting (featured, etc.)
        }

        // Fetch filtered and sorted products with pagination (example: 12 products per page)
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const products = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
        .sort(sortCriteria)
        .skip((page - 1) * limit)
        .limit(limit);

        // Count total products for pagination calculation
        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        });

        const totalPages = Math.ceil(totalProducts / limit);

        return res.render('shopPage', {
            user : userData,
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