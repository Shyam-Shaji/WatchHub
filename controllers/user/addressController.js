const Address = require('../../models/addressSchema.js');

const addAddress = async (req, res) => {
    const userId = req.session.user;
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


module.exports = {
    addAddress,
}