const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const getProductAddPage = async(req,res)=>{
    try {

        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});
        res.render('product-add',{
            cat: category,
            brand: brand,
        })
        
    } catch (error) {
        res.redirect('/pageError');
    }
}

const addProducts = async(req,res)=>{
    try {

        const products = req.body;
        const productExists = await Product.findOne({
            productName : products.productName,
        });

        if(!productExists){
            const images = [];

            if(req.files && req.files.length>0){
                for(let i = 0 ; i < req.files.length; i++){
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:450,height:450}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({name:products.category});

            if(!categoryId){
                return res.status(400).json('Invalid Category name');
            }

            const newProduct = new Product({
                productName : products.productName,
                description : products.description,
                brand : products.brand,
                category : categoryId._id,
                regularPrice : products.regularPrice,
                salePrice : products.salePrice,
                createdAt : new Date(),
                quantity : products.quantity,
                // size : products.size,
                // color : products.color,
                productImage : images,
                status : 'Available',
            })
            await newProduct.save();
            return res.redirect('/admin/addProducts');
        }else {
            return res.status(400).json("Product already exist, please try with another name");
        }
        
    } catch (error) {
        console.log('Error saving products',error);
        return res.redirect('/admin/pageError');
    }
}

const getAllProducts = async(req,res)=>{
    try {

        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({
            $or:[
                {productName:{$regex: new RegExp(".*"+search+".*","i")}},
                {brand:{$regex: new RegExp(".*"+search+".*","i")}},
            ],
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec();

        const count = await Product.find({
            $or : [
                {productName:{$regex: new RegExp(".*"+search+".*","i")}},
                {brand:{$regex: new RegExp(".*"+search+".*","i")}},
            ],
        }).countDocuments();

        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});

        if(category && brand){
            res.render("products",{
                data : productData,
                currentPage : page,
                totalPages : Math.ceil(count/limit),
                cat : category,
                brand : brand,
            })
        }else{
            // res.render('page-404');
            res.redirect('/admin/pageError');
        }
        
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}

const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        const findProduct = await Product.findOne({ _id: productId });
        const findCategory = await Category.findOne({ _id: findProduct.category });

        if (!findProduct || !findCategory) {
            return res.json({ status: false, message: "Product or category not found" });
        }

        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product category already has a better offer" });
        }

        // Update salePrice based on regularPrice and the percentage discount
        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage, 10);

        await findProduct.save();

        // Reset category offer if product offer is higher
        findCategory.categoryOffer = 0;
        await findCategory.save();

        res.json({ status: true });
    } catch (error) {
        console.error('Error in adding product offer:', error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const findProduct = await Product.findOne({ _id: productId });

        if (!findProduct) {
            return res.json({ status: false, message: "Product not found" });
        }

        const percentage = findProduct.productOffer;

        // Recalculate salePrice to remove the offer
        findProduct.salePrice = findProduct.regularPrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;

        await findProduct.save();

        res.json({ status: true });
    } catch (error) {
        console.error('Error in removing product offer:', error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
}