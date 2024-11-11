const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');

const loadShopPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user }).lean();
        
        // Retrieve the sorting option from query parameters (default to 'newArrivals' if none provided)
        const sortOption = req.query.sort || 'newArrivals';
        const categories = await Category.find({ isListed: true }).lean();
        
        // Prepare sorting criteria based on the selected option
        let sortCriteria;
        switch (sortOption) {
            case 'priceLowHigh':
                sortCriteria = { salePrice: 1 }; // Ascending price
                break;
            case 'priceHighLow':
                sortCriteria = { salePrice: -1 }; // Descending price
                break;
            case 'nameAZ':
                sortCriteria = { productName: 1 }; // Alphabetical order
                break;
            case 'nameZA':
                sortCriteria = { productName: -1 }; // Reverse alphabetical
                break;
            case 'newArrivals':
            default:
                sortCriteria = { createdAt: -1 }; // Latest products first
        }

        // Pagination setup
        const page = parseInt(req.query.page) || 1;
        const limit = 12;

        // Fetch products with filters, sorting, and pagination
        const products = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
        .sort(sortCriteria)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

        // Count total products for pagination
        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        });
        const totalPages = Math.ceil(totalProducts / limit);

        // Render shop page with the sorted and paginated products
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