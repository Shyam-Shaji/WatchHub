const Address = require('../../models/addressSchema.js');
const User  = require('../../models/userSchema.js');

const loadAddAddressPage = async(req,res)=>{
    try {
        const user = req.session.user
        const userData = await User.findById(user)

       return res.render('addAddress',{user:userData||null});
        
    } catch (error) {
        console.error('address page error',error);
    }
}

const addAddress = async (req, res) => {
    const userId = req.session.user;
    console.log('checking the user id is coming or not',userId);
    const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

    if (!userId || !addressType || !name || !city || !landMark || !state || !pincode || !phone || !altPhone) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({ userId, address: [] });
        }

        userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
        await userAddress.save();

        res.redirect('/user-profile?success=true'); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

const showAddress = async(req,res)=>{

    const userId = req.session.user;

    try {

        const userAddress = await Address.findOne({userId});
        const addresses = userAddress ? userAddress.address : [];
        return res.render('address', {addresses});
        
    } catch (error) {
        console.error(error);
        res.status(500).json({error:"Server error"});
    }
}

//edit addressPage load
const updateAddress = async(req,res)=>{
    try {

        const {addressId} = req.params;
        const userId = req.session.user;

        const userAddress = await Address.findOne({ userId, "address._id": addressId }, { "address.$": 1 });

        if(!userAddress || userAddress.address.length === 0) {
            return res.status(404).send('Address not found');
        }

        res.render('editAddress', {address: userAddress.address[0]} );

        
    } catch (error) {
        console.error('UpdateAddress page error', error);
        res.status(500).send('Server error');
    }
}

//for updating
const updatedAddress = async(req,res)=>{
    const { addressId } = req.params;
    const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
    try {

        await Address.updateOne(
            { "address._id": addressId }, 
            { $set: {
                "address.$.addressType": addressType,
                "address.$.name": name,
                "address.$.city": city,
                "address.$.landMark": landMark,
                "address.$.state": state,
                "address.$.pincode": pincode,
                "address.$.phone": phone,
                "address.$.altPhone": altPhone
            }}
        )
        res.redirect('/user-profile?success=updated');
    } catch (error) {
        console.error('Error updating address: ',error);
        res.status(500).send("Server error");
    }
}

const deleteAddress = async(req,res)=>{
    const { addressId } = req.params;
    const userId = req.session.user;

    try {

        await Address.updateOne(
            { userId },
            { $pull : {address : {_id: addressId}} }
        );

        res.status(200).json({ message: 'Address delete successfully' });
        
    } catch (error) {
        console.error('Error deleting address: ', error);
        res.status(500).json({error: "Server error"});
    }
}

module.exports = {
    loadAddAddressPage,
    addAddress,
    showAddress,
    updateAddress,
    updatedAddress,
    deleteAddress,
}