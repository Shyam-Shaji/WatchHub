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
        
        const user = req.session.user;

        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

       
        const userData = await User.findById({_id:user});
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

       
        let wallet = await Wallet.findOne({ userId: user });

        
        if (!wallet) {
            wallet = await Wallet.create({
                userId: user,
                walletBalance: 0,
                transactions: [],
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalTransactions = wallet.transactions.length;

        const paginatedTranscations = wallet.transactions.slice(skip, skip + limit);

        const totalPages = Math.ceil(totalTransactions / limit);

        

       
        return res.render('wallet', {
            user : userData,
            walletBalance: wallet.walletBalance,
            transactions: paginatedTranscations,
            currentPage : page,
            totalPages : totalPages,
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