const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const {userAuth,adminAuth} = require('../middlewares/auth');


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
module.exports = router;