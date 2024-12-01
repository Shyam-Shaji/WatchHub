const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const moment = require('moment');
const bcrypt = require('bcrypt');

const pageerror = async(req,res)=>{
    res.render('admin-error');
}

const loadLogin = async(req,res)=>{
    console.log('workki')
    if(req.session.admin){
        return res.redirect('/admin/dashboard');
    }
    res.render('admin-login',{message:null});
}

const login = async(req,res)=>{
    try {
        console.log('workinhg')
        const {email,password} = req.body;
        console.log(req.body)
        const admin = await User.findOne({email,isAdmin:true});
        console.log('17')
        if(admin){
            console.log('19')
            const passwordMatch = await bcrypt.compare(password,admin.password);

            if(passwordMatch){
                console.log('23')
                req.session.admin = true;
                
                return res.redirect('/admin/dashboard');
            }else{
                return res.redirect('/admin/login');
            }
            
        }else{
            return res.redirect('/admin/login');
        }
        
    } catch (error) {
        console.log("Login Error",error);
        return res.redirect('pageerror');
    }
}

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            const { filter } = req.query; 
            const page = parseInt(req.query.page) || 1; 
            const limit = 10; 
            const skip = (page - 1) * limit; 
            let filterCriteria = { status: "Completed" }; 

           
            if (filter === "today") {
                const startOfDay = moment().startOf('day').toDate();
                const endOfDay = moment().endOf('day').toDate();
                filterCriteria.orderDate = { $gte: startOfDay, $lte: endOfDay };
            } else if (filter === "thisWeek") {
                const startOfWeek = moment().startOf('week').toDate();
                const endOfWeek = moment().endOf('week').toDate();
                filterCriteria.orderDate = { $gte: startOfWeek, $lte: endOfWeek };
            } else if (filter === "lastMonth") {
                const startOfLastMonth = moment().subtract(1, 'month').startOf('month').toDate();
                const endOfLastMonth = moment().subtract(1, 'month').endOf('month').toDate();
                filterCriteria.orderDate = { $gte: startOfLastMonth, $lte: endOfLastMonth };
            }

            
            const totalOrders = await Order.countDocuments(filterCriteria);
            console.log('checking totoal orders: ',totalOrders);

            const totalAmountResult = await Order.aggregate([
                {$match : filterCriteria},
                {$group : {_id: null, totalAmount : {$sum:"$totalAmount"}}}
            ])

            const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

           
            const completedOrders = await Order.find(filterCriteria)
                .sort({ orderDate: -1 }) 
                .skip(skip)
                .limit(limit);

                console.log('checking completed orders',completedOrders);

            const totalPages = Math.ceil(totalOrders / limit); 

            const totalProducts = await Product.countDocuments({});
            
            res.render('dashboard', {
                completedOrders,
                currentPage: page,
                totalPages,
                filter,
                totalOrders,
                totalAmount,
                totalProducts, 
            });
        } catch (error) {
            console.error('Error fetching completed orders: ', error);
            res.redirect('/pageerror');
        }
    } else {
        res.redirect('/admin/login');
    }
};

const logout = async (req,res)=>{
    try {

        req.session.destroy(error =>{
            if(error){
                console.log("Error destroying session",error);
                return res.redirect('/pageerror');
            }
            res.redirect('/admin/login');
        });
        
    } catch (error) {
        console.log('unexpected error during logout',error);
        res.redirect('/admin/pageerror');
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}