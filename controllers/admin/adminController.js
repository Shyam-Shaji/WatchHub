const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
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

const loadDashboard = async(req,res)=>{

    if(req.session.admin){

        try {
            const completedOrders = await Order.find({status
                : "Completed"});
            console.log('checking completed order coming: ', completedOrders);
            res.render('dashboard',{completedOrders});
        } catch (error) {
            console.error('Error fetching completed orders: ',error);
            res.redirect('/pageerror');
        }

    }else{
        res.redirect('/admin/login');
    }

}

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