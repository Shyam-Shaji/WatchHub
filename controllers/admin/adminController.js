const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { format } = require('morgan');

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
            }else if(filter === 'yearly'){
                const startOfYear = moment().startOf('year').toDate();
                const endOfYear = moment().endOf('year').toDate();
                filterCriteria.orderDate = {$gte : startOfYear, $lte: endOfYear};
            }

            
            const totalOrders = await Order.countDocuments(filterCriteria);
            console.log('checking totoal orders: ',totalOrders);

            const totalAmountResult = await Order.aggregate([
                {$match : filterCriteria},
                {$group : {_id: null, totalAmount : {$sum:"$totalAmount"}}}
            ])

            const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

           
            const completedOrders = await Order.aggregate([
                { $match: filterCriteria },
                { $unwind: "$items" }, // Unwind items to access each product in the order
                {
                    $lookup: {
                        from: "products",
                        localField: "items.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" }, // Unwind to get product details
                {
                    $project: {
                        orderId: 1,
                        orderDate: 1,
                        totalAmount: 1,
                        status: 1,
                        paymentMethod: 1,
                        productName: "$productDetails.productName"
                    }
                },
                { $sort: { orderDate: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);

                console.log('checking completed orders',completedOrders);

            const totalPages = Math.ceil(totalOrders / limit); 

            const totalProducts = await Product.countDocuments({});

            const startOfMonth = moment().startOf('month').toDate();
            const endOfMonth = moment().endOf('month').toDate();

            const monthlyIncomeResult = await Order.aggregate([
                {
                    $match : {
                        orderDate : {$gte : startOfMonth, $lte : endOfMonth},
                        status : "Completed"
                    }
                },
                {
                    $group : {
                        _id:null,
                        monthlyIncome : {$sum : "$totalAmount"}
                    }
                }
            ]);

            const monthlyIncome = monthlyIncomeResult.length > 0 ? monthlyIncomeResult[0].monthlyIncome : 0;

            const chartData = await Order.aggregate([
                { $match: filterCriteria },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                        totalAmount: { $sum: "$totalAmount" },
                    },
                },
                { $sort: { _id: 1 } },
            ]);

            console.log('checking chartData ', chartData);

            const formattedChartData = {
                labels: chartData.map(data => data._id),
                sales: chartData.map(data => data.totalAmount),
            };

            console.log('checking formattedchartdata : ',formattedChartData);

            const bestSellingProducts = await Order.aggregate([
                { $unwind: "$items" }, 
                {
                    $group: {
                        _id: "$items.product",
                        totalQuantity: { $sum: "$items.quantity" }, 
                    },
                },
                { $sort: { totalQuantity: -1 } }, 
                { $limit: 10 }, 
                {
                    $lookup: {
                        from: "products", 
                        localField: "_id", 
                        foreignField: "_id", 
                        as: "productDetails", 
                    },
                },
                { $unwind: "$productDetails" }, 
                {
                    $project: {
                        productId: "$_id", 
                        productName: "$productDetails.productName", 
                        totalQuantity: 1,
                        regularPrice: "$productDetails.regularPrice", 
                        salePrice: "$productDetails.salePrice", 
                        productImage: "$productDetails.productImage", 
                    },
                },
            ]);

            const bestSellingBrands = await Order.aggregate([
                { $unwind: "$items" }, 
                {
                    $lookup: {
                        from: "products", 
                        localField: "items.product",
                        foreignField: "_id",
                        as: "productDetails",
                    },
                },
                { $unwind: "$productDetails" }, 
                {
                    $group: {
                        _id: "$productDetails.brand", 
                        totalQuantity: { $sum: "$items.quantity" }, 
                    },
                },
                { $sort: { totalQuantity: -1 } }, 
                { $limit: 10 }, 
                {
                    $project: {
                        brand: "$_id",
                        totalQuantity: 1,
                        _id: 0,
                    },
                },
            ]);
            
            res.render('dashboard', {
                completedOrders,
                currentPage: page,
                totalPages,
                filter,
                totalOrders,
                totalAmount,
                totalProducts,
                monthlyIncome,
                chartData: formattedChartData,
                bestSellingProducts,
                bestSellingBrands
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