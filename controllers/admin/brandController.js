const Brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');

const getBrandPage = async(req,res)=>{
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();
        res.render('brands',{
            data : reverseBrand,
            currentPage : page,
            totalPages : totalPages,
            totalBrands : totalBrands,
        })
        
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const addBrand = async(req,res)=>{
    try {

        const brand = req.body.name;
        console.log("checking branddd: ",brand);
        console.log("checking request body: ",req.body);
        const findBrand = await Brand.findOne({brand});

        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName : brand,
                brandImage : image,
            })
            await newBrand.save();
            res.redirect('/admin/brands');
        }
        
    } catch (error) {
        res.redirect('/pageError');
    }
}

// Blocking a brand
const blockBrand = async (req, res) => {
    try {
      const id = req.query.id;
      await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });  // Use isBlocked here
      res.redirect('/admin/brands');
    } catch (error) {
      console.error("Error blocking brand:", error);
      res.redirect('/pageError');
    }
  };
  
  // Unblocking a brand
  const unBlockBrand = async (req, res) => {
    try {
      const id = req.query.id;
      await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } }); // Use isBlocked here
      res.redirect('/admin/brands');
    } catch (error) {
      console.error("Error unblocking brand:", error);
      res.redirect('/pageError');
    }
  };
  
  
  const deleteBrand = async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).redirect('/pageError');
      }
  
      await Brand.deleteOne({ _id: id });
      res.redirect('/admin/brands');
    } catch (error) {
      console.log('Error deleting brand:', error);
      res.status(500).redirect('/pageError');
    }
  };
  

module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
}