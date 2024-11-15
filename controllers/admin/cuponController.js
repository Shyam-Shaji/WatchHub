const Coupon = require('../../models/cuponSchema');

const getCuponList = async(req,res)=>{
    try {

        const perPage = 10;
        const currentPage = parseInt(req.query.page) || 1;

        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons/perPage);

        const coupons = await Coupon.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .sort({createOn: -1});

        res.render('cupon-list',{
            coupons,
            currentPage,
            totalPages,
        });
        
    } catch (error) {
        console.error("Error fetching list: ",error);
        res.status(500).send("Server Error");
    }
}

const getCouponForm = async(req,res)=>{
    try {

         res.render('add-cupon');
        
    } catch (error) {
        console.error('Error in get add coupon page',error);
        res.status(500).send('Server error');
    }
}

const createCoupon = async(req,res)=>{
    try {

        const {name, expireOn, offerPrice, minimumPrice, isList, userId} = req.body;

        console.log('checking req body in coupon adding : ',req.body);

        const newCoupon = new Coupon({
            name,
            createOn : new Date(),
            expireOn,
            offerPrice,
            minimumPrice,
            isList : isList === 'true',
            userId : userId || null,
        });

        await newCoupon.save();
        res.redirect('/admin/coupon-list');
        
    } catch (error) {
       console.error('Error creating coupon: ',error) ;
       res.status(500).send('Server Error');
    }
}

const deleteCoupon = async(req,res)=>{
    try {

        const {id} = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if(!deletedCoupon){
            return res.status(404).send("Coupon not found");
        }

        res.redirect('/admin/coupon-list');
        
    } catch (error) {
        console.error('Error deleting coupon: ', error);
        res.status(500).send("Server Error");
    }
}

const getEditCouponForm = async(req,res)=>{
    try {

        const {id} = req.params;
        const coupon = await Coupon.findById(id);

        if(!coupon){
            return res.status(404).send("Coupon not found");
        }

        res.render('edit-coupon',{coupon});
        
    } catch (error) {
        console.error("Error fetching coupon: ",error);
        res.status(500).send("Server Error");
    }
}

const updateCoupon = async(req,res)=>{
    try {

        const {id} = req.params;
        const {name, expireOn, offerPrice, minimumPrice, isList, userId} = req.body;

        const updateCoupon = await Coupon.findByIdAndUpdate(
            id,
            {
                name,
                expireOn,
                offerPrice,
                minimumPrice,
                isList : isList === 'true',
                userId : userId || null,
            },
            {new:true, runValidators:true}
        );

        if(!updateCoupon){
            return res.status(404).send("Coupon not found");
        }

        res.redirect('/admin/coupon-list');
        
    } catch (error) {
        console.error("Error updating coupon: ",error);
        res.status(500).send("Server Error");
    }
};

module.exports = {
    getCuponList,
    getCouponForm,
    createCoupon,
    deleteCoupon,
    getEditCouponForm,
    updateCoupon,
}