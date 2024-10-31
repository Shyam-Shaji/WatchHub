const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const profileController = require('../controllers/user/profileController');
const addressController = require('../controllers/user/addressController');
const cartController = require('../controllers/user/cartController');
const shopController = require('../controllers/user/shopController');
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
//user profile

//user address
router.get('/loadAddressPage',addressController.loadAddAddressPage);
router.post('/addAddress',addressController.addAddress);
router.get('/showAddress',addressController.showAddress);
router.get('/editAddress/:addressId',addressController.updateAddress);
router.post('/editAddress/:addressId',addressController.updatedAddress);
router.delete('/deleteAddress/:addressId',addressController.deleteAddress);
//user address

//cart management
router.get('/addToCart',cartController.addToCart);
router.get('/cart',cartController.viewCart);
router.post('/removeFromCart',cartController.removeCart);
router.get('/updateQuantity',cartController.updateQuantity);
//cart management

//Shop controller
router.get('/loadShopPage',shopController.loadShopPage);
//Shop controller

module.exports = router;