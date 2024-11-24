const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');

// const getWallet = async (req, res) => {
//     try {
       
//         const user = {
//             walletBalance: 150.75,
//             transactions: [
//                 { date: '2024-11-01', description: 'Deposit', amount: 100, status: 'Completed' },
//                 { date: '2024-11-10', description: 'Withdrawal', amount: 50, status: 'Pending' },
//             ],
//         };

//         // Pass user data to the wallet view
//         return res.render('wallet', { user });
//     } catch (error) {
//         console.error('Error rendering wallet page:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };

const getWallet = async (req, res) => {
    try {
        // Retrieve the user ID from the session
        const user = req.session.user;

        // Check if the session user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        // Retrieve user data
        const userData = await User.findById({_id:user});
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Fetch the wallet associated with the user
        let wallet = await Wallet.findOne({ userId: user });

        // If wallet doesn't exist, create a default one
        if (!wallet) {
            wallet = await Wallet.create({
                userId: user,
                walletBalance: 0,
                transactions: [],
            });
        }

        // Pass the user and wallet data to the view
        return res.render('wallet', {
            user : userData,
            walletBalance: wallet.walletBalance,
            transactions: wallet.transactions,
        });
    } catch (error) {
        console.error('Error rendering wallet page:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

module.exports = {
    getWallet,
}