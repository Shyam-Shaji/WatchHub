const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const profileController = require('../controllers/user/profileController');
const orderController = require('../controllers/user/orderController');
const orderDetailController = require('../controllers/user/orderDetailController');
const walletController = require('../controllers/user/walletController');
const addressController = require('../controllers/user/addressController');
const wishlistController = require('../controllers/user/wishlisControllert');
const cartController = require('../controllers/user/cartController');
const shopController = require('../controllers/user/shopController');
const checkoutController = require('../controllers/user/checkoutController');
const razorypayController = require('../controllers/user/razorpayController');
const passport = require('passport');
const auth = require('../middlewares/auth');

router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHomePage);

router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/signup',userController.loadSignup);
router.get('/logout',userController.logout);

router.post('/signup',userController.signup);
router.post('/verify-otp',userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});

//Profile Management
router.get('/forgot-password',profileController.getForgotPassPage);
router.post('/forgot-email-valid',profileController.forgotEmailValid);
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp);
router.get('/reset-password',profileController.getRestPassPage);
router.post('/resend-forgot-otp',profileController.resendOtp);
router.post('/reset-password',profileController.postNewPassword);
//Profile Management

//product Details
router.get('/productDetails/:id',auth.userAuth,userController.loadProductDetail);
//product Details

//user profile
router.get('/user-profile',userController.userDashboard);
router.post('/update-profile', userController.updateUserProfile);
//user profile

//user address
router.get('/loadAddressPage',addressController.loadAddAddressPage);
router.post('/addAddress',addressController.addAddress);
router.get('/showAddress',addressController.showAddress);
router.get('/editAddress/:addressId',addressController.updateAddress);
router.post('/editAddress/:addressId',addressController.updatedAddress);
router.delete('/deleteAddress/:addressId',addressController.deleteAddress);
//user address

//wishlist
router.get('/wishlistPage',wishlistController.wishlistPage);
router.get('/addToWishlist',wishlistController.addToWishlist);
router.get('/removeFromWishlist/:id',wishlistController.removeFromWishlist);
//wishlist

//cart management
router.get('/addToCart',cartController.addToCart);
// router.post('/addToCart',cartController.addToCart);
router.get('/cart',cartController.viewCart);
router.post('/removeFromCart',cartController.removeCart);
router.get('/updateQuantity',cartController.updateQuantity);

router.get('/getCoupons',cartController.getCoupon);
router.post('/applyCoupon',cartController.applyCoupon);
router.post('/removeCoupon',cartController.removeCoupon);
//cart management

//Shop controller
router.get('/loadShopPage',shopController.loadShopPage);
//Shop controller

//order
router.get('/orders', orderController.viewOrder);
router.post('/createOrder',orderController.createOrder);
router.post('/cancel-order/:orderId',orderController.orderCancell);
router.post('/return-order/:orderId',orderController.returnOrder);
router.get('/invoice/:id',orderController.getInvoicePage);
router.get('/orderDetail/:id',orderDetailController.getOrderDetailPage);
//order

//wallet 
router.get('/wallet',auth.userAuth,walletController.getWallet);
//wallet

//checkout
router.get('/checkoutPage',checkoutController.checkoutPage);
router.post('/place-order',checkoutController.placeOrder);
//checkout


router.post('/verify-payment',razorypayController.verifyPayment);

//razorpay
router.post('/create-order',razorypayController.createOrder);
router.get('/get-razorpay-key',razorypayController.getRazorpayKey);
//razorpay

module.exports = router;