const User = require('../../models/userSchema.js');
const Category = require('../../models/categorySchema.js');
const Product = require('../../models/productSchema.js');
const nodemail = require('nodemailer');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();

// const loadLogin = async(req,res)=>{
//     try {
//        return res.render('login') ;
//     } catch (error) {
//         console.log("Login Page Not Found");
//         res.status(500).send("Server Error");
//     }
// }

const loadLogin = async(req,res)=>{
    try {

        if(!req.session.user){
            return res.render('login');
        }else{
            res.redirect('/');
        }
        
    } catch (error) {
       res.redirect('/pageNotFound');
    }
}

const loadSignup = async(req,res)=>{
    try {
        return res.render('signup');
    } catch (error) {
        console.log("Signup Page Not Found");
        res.status(500).send("Server Error");
    }
}

const logout = async(req,res)=>{
    try {

        req.session.destroy((error)=>{
            if(error){
                console.log("Session destruction error",error.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect('/login');
        })
        
    } catch (error) {
        console.log("Logout error",error);
        res.redirect('/pageNotFound');
    }
}

const pageNotFound = async(req,res)=>{
    try {
        res.render('404');
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

const loadHomePage = async (req,res)=>{
    try {
        const user = req.session.user;
       const categories = await Category.find({isListed: true});
       let productData = await Product.find({
        isBlocked: false,
        category : {$in:categories.map(category=>category._id)},quantity :{$gt:0}
       });

       productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
       productData = productData.slice(0,4);

        if(user){

            const userData = await User.findOne({ _id: user });

            console.log('checking userData: ',userData);

            // if (!userData) {
            //     console.log("User not found in the database.");
            //     return res.status(404).send("User not found");
            // }

            res.render('home',{ user:userData, products:productData });

        }else{
            return res.render('home' , {products:productData}, { user : null }, );
        }
        
    } catch (error) {
        console.log("Home page not loading",error);
        res.status(500).send("Server Error");
    }
}

// const signup = async(req,res)=>{

//     // const {name,email,phone,password} = req.body;

//     try {

//         const {email,password,cPassword} = req.body;

//         // const newUser = new User ({name,email,phone,password});

//         console.log(newUser);

//         await newUser.save();
//         return res.redirect('/signup');
        
//     } catch (error) {
//         console.log('Error for save usesr',error);
//         res.status(500).send("Internel server error");
//     }
// }

async function generateOtp () {
    console.log("OTP generation function called."); // Added log to check function call
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp); // Added log to check generated OTP
    return otp;
}
async function sendVerificationEmail(email, otp) {
    try {
        console.log("Sending OTP to email:", email); // Log email

        const transporter = nodemail.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP is ${otp}</b>`,
        });

        console.log("Email sent:", info); // Log info about email
        return info.accepted.length > 0;

    } catch (error) {
        console.log("Error Sending Email", error);
        return false;
    }
}


const signup = async(req, res) => {
    try {
        const { name, phone, email, password, password_confirm } = req.body;

        // Check if passwords match
        if (password !== password_confirm) {
            return res.render("signup", { message: "Passwords do not match" });
        }

        // Check if user already exists
        const findUser = await User.findOne({ email: email });
        if (findUser) {
            return res.render('signup', { message: "User with this email already exists" });
        }

        // Generate OTP 
        const otp = await generateOtp();
       

        // Send OTP  email
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("Error in sending OTP via email");
        }

        
        // Save OTP and user data in to  session
        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };
       


        // Redirect to OTP verification page
        console.log("OTP Sent:", otp);
        res.render('verify-otp');

    } catch (error) {
        console.log("Signup error:", error);
        res.render('/pageNotFound');
    }
};

const securePassword = async(password)=>{
    try {

        const passwordHash = await bcrypt.hash(password,10)

        return passwordHash;
        
    } catch (error) {
        
    }
}

const verifyOtp = async(req,res)=>{
    try {
        const {otp} = req.body;
        console.log(otp);

        if(otp == req.session.userOtp){
            const user = req.session.userData;
            console.log('loggin user: ',user);
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name : user.name,
                email : user.email,
                phone : user.phone,
                password : passwordHash,
            })
            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
        }

    } catch (error) {
        console.log("Error Verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"});
    }
}

const resendOtp = async (req,res)=>{
    try {

        const {email} = req.session.userData;

        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email.otp);

        if(emailSent){
            console.log("Resend OTP: ",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"});
        }else{
            res.status(500).json({success:false,message:"Faild to resend OTP. Please try again"});
        }
        
    } catch (error) {
        console.log("Error resending OTP",error);
        res.status(500).json({success:false,message:"Internal Server Error. Please try again"});
    }
}

const login = async(req,res)=>{
    try {

        const {email,password} = req.body;

        const findUser = await User.findOne({ isAdmin:0, email : email });

        if(!findUser){
            return res.render('login',{message:"User not found"});
        }

        if(findUser.isBlocked){
            return res.render('login',{message:"User is blocked by admin"});
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render('login',{message:"Incorrect Password"});
        }

        req.session.user = findUser._id;
        res.redirect('/');
        
    } catch (error) {

        console.log("Login Error");
        res.render('login',{message:"Login failed. Please try again later."});
        
    }
}


module.exports = {
    loadHomePage,
    pageNotFound,
    loadLogin,
    loadSignup,
    signup,
    logout,
    verifyOtp,
    resendOtp,
    login,
    
}