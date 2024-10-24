const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const profileController = require('../controllers/user/profileController');
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

module.exports = router;