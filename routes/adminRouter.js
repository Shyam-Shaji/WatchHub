const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const brandController = require('../controllers/admin/brandController');
const productController = require('../controllers/admin/productController');
const orderlistController = require('../controllers/admin/orderlistController');
const couponController = require('../controllers/admin/cuponController');
const salesController = require('../controllers/admin/salesController');
const {userAuth,adminAuth} = require('../middlewares/auth');
const multer = require('multer');
const storage = require('../helpers/multer');
const uploads = multer({storage:storage});


router.get('/pageError',adminController.pageerror);
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/dashboard',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

// Customer management
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked);
// Customer management

//Categories Management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer);
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer);
router.get('/listCategory',adminAuth,categoryController.getListCategory);
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory);
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.editCategory);
//Categories Management

//Brand Management
router.get('/brands',adminAuth,brandController.getBrandPage);
router.post('/addBrand',adminAuth,uploads.single("image"),brandController.addBrand);
router.get('/blockBrand',adminAuth,brandController.blockBrand);
router.get('/unBlockBrand',adminAuth,brandController.unBlockBrand);
router.get('/deleteBrand',adminAuth,brandController.deleteBrand);
//Brand Mangement

//Product Mangement
router.get('/addProducts',adminAuth,productController.getProductAddPage);
router.post('/addProducts',adminAuth,uploads.array('images',4),productController.addProducts);
router.get('/products',adminAuth,productController.getAllProducts);
router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer);
router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unblockProduct',adminAuth,productController.unblockProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct);
router.post('/editProduct/:id',adminAuth,uploads.array('images',4),productController.editProduct);
router.post('/deleteImage',adminAuth,productController.deletSingleImage);
//Product Management

//orderlist
router.get('/orderlist',orderlistController.orderList);
router.post('/orders/update-order-status/:orderId', orderlistController.updateOrderStatus);
router.post('/orders/approve-return/:id',orderlistController.returnApprove);
//orderlist

//return order list
router.get('/returnList',orderlistController.returnOrderList);
//return order list

//coupon management
router.get('/coupon-list',adminAuth,couponController.getCuponList);
router.get('/addCoupon',adminAuth,couponController.getCouponForm);
router.post('/addCoupon',adminAuth,couponController.createCoupon);
router.post('/deleteCoupon/:id',adminAuth,couponController.deleteCoupon);
router.get('/editCoupon/:id',adminAuth,couponController.getEditCouponForm);
router.post('/updateCoupon/:id',adminAuth,couponController.updateCoupon);
//coupon management

//sales report
router.get('/sales-report/download',adminAuth,salesController.downloadReport);
//sales report


module.exports = router;