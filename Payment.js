 const mongoose = require("mongoose");

const axios = require("axios");

const nodemailer = require("nodemailer");

// اس لائن کو ایسے بدلیں

const { User } = require("./User");


const Alpaca = require("@alpacahq/alpaca-trade-api"); // Alpaca پیکج شامل کریں



// --- Alpaca Configuration ---

const alpaca = new Alpaca({

  keyId: "PKKZ47I6AYFLMUQW7CORVN74AZ", // اپنا Alpaca Key ID یہاں ڈالیں

  secretKey: "GtdeE8jbQctQXcwvdWhqQ1QR9qryqULE5FpfCaEQWzcB",

  paper: true, // ڈیمو ٹریڈنگ کے لیے true رکھیں

});



const paymentSchema = new mongoose.Schema({

  userName: String,

  userEmail: String,

  challengeTitle: String,

  amount: Number,

  stage: String,

  transactionType: String,

  tid: String,

  screenshot: String,

  walletAddress: String,

  tradingId: String,

  tradingPassword: String,

  cryptoAmount: String,

  cryptoSymbol: String,

  serverName: String,
 withdrawFrom: { type: String, enum: ["Trading", "Referral"], default: "Referral" },


  status: { type: String, default: "Pending" },

  date: { type: Date, default: Date.now },

});

const adminSettingsSchema = new mongoose.Schema({

  coinSymbol: { type: String, unique: true }, // جیسے SOL, BTC, USDT

  walletAddress: String,

  qrCodeUrl: String,

});



const AdminSettings = mongoose.models.AdminSettings || mongoose.model("AdminSettings", adminSettingsSchema);



const Payment =

  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);







  const updateAdminSettings = async (req, res) => {

  try {

    const { coinSymbol, walletAddress, qrCodeUrl } = req.body;

    const settings = await AdminSettings.findOneAndUpdate(

      { coinSymbol: coinSymbol.toUpperCase() },

      { walletAddress, qrCodeUrl },

      { upsert: true, new: true }

    );

    res.status(200).json({ success: true, settings });

  } catch (err) {

    res.status(500).json({ msg: "Update Error", error: err.message });

  }

};

const getAdminSettings = async (req, res) => {

  try {

    const settings = await AdminSettings.find();

    res.status(200).json(settings);

  } catch (err) {

    res.status(500).json({ msg: "Fetch Error" });

  }

};

 



// ای میل بھیجنے کا فنکشن

// ای میل بھیجنے کا فنکشن اپڈیٹ کریں

const sendLoginCredentials = async (userEmail, loginId, password, amount, serverName) => {

  let transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {

      user: "developerpro58@gmail.com",

      pass: "rtbrbehkftlwdcwj",

    },

  });



  const mailOptions = {

    from: '"Amplifier Trading" <developerpro58@gmail.com>',

    to: userEmail,

    subject: "Account Approved - Trading Credentials",

    html: `

        <div style="font-family: Arial, sans-serif; border: 1px solid #00cf92; padding: 20px; border-radius: 10px; max-width: 600px;">

            <h2 style="color: #00cf92;">Congratulations!</h2>

            <p>Your deposit of <strong>$${amount}</strong> has been approved.</p>

           

            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; border-left: 5px solid #00cf92;">

                <h4 style="margin-top: 0;">Your MT5 Trading Credentials:</h4>

                <p style="margin: 5px 0;"><strong>Server Name:</strong> <span style="color: #333; font-weight:bold;">${serverName || "MetaQuotes-Demo"}</span></p>

                <p style="margin: 5px 0;"><strong>Login ID:</strong> <span style="color: #333;">${loginId}</span></p>

                <p style="margin: 5px 0;"><strong>Password:</strong> <span style="color: #333;">${password}</span></p>

            </div>



            <p style="margin-top: 20px;">Use these details to login to your MetaTrader 5 terminal.</p>

            <div style="text-align: center; margin-top: 30px;">

                <a href="http://localhost:3001/Dashboard" style="background: #00cf92; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>

            </div>

        </div>

    `,

  };



  return transporter.sendMail(mailOptions);

};



// فائل کے سب سے اوپر یہ چیک کر لیں

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, customAmount, mt5Login, mt5Password, serverName } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ msg: "Payment record not found" });

    const userEmailClean = payment.userEmail.trim();
    const user = await User.findOne({ 
      email: { $regex: new RegExp("^" + userEmailClean + "$", "i") } 
    });

    if (!user) return res.status(404).json({ msg: "User not found" });

    if (status === "Approved") {
      if (payment.transactionType === "Deposit") {
        const amountToAdd = Number(customAmount) || Number(payment.amount);
        user.tradingBalance = (Number(user.tradingBalance) || 0) + amountToAdd;
        
        user.mt5Login = mt5Login || user.mt5Login;
        user.mt5Password = mt5Password || user.mt5Password;
        user.mt5Server = serverName || user.mt5Server;
        user.isApproved = true;
      } 
      else if (payment.transactionType === "Withdraw") {
        const withdrawAmount = Number(payment.amount);

        if (payment.withdrawFrom === "Trading") {
          // 1. ڈیٹا بیس سے پیسے کاٹیں
          user.tradingBalance = (Number(user.tradingBalance) || 0) - withdrawAmount;

          // 2. لائیو MT5 اکاؤنٹ سے پیسے کاٹنے کے لیے Python Bridge کو کال کریں
          try {
            const pythonResponse = await axios.post("http://localhost:5000/deduct_balance", {
              mt5_id: user.mt5Login,
              password: user.mt5Password,
              server: user.mt5Server,
              amount: withdrawAmount
            });
            console.log("✅ MT5 Sync Success:", pythonResponse.data.message);
          } catch (pyError) {
            console.error("❌ MT5 Sync Failed:", pyError.response?.data?.message || pyError.message);
            // یہاں آپ چاہیں تو ایرر بھیج سکتے ہیں اگر MT5 سے پیسے نہ کٹیں تو اپروو نہ ہو
            // return res.status(400).json({ msg: "MT5 balance deduction failed. Please check credentials." });
          }
        } else {
          user.totalReferralWithdrawn = (Number(user.totalReferralWithdrawn) || 0) + withdrawAmount;
        }
      }
    }

    payment.status = status;
    await user.save();
    await payment.save();

    res.json({ success: true, msg: "Status updated and balance adjusted across DB & MT5!" });

  } catch (error) {
    console.error("🔥 Error:", error);
    res.status(500).json({ msg: "Server Error", error: error.message });
  }
};

const processPayment = async (req, res) => {
  try {
    const { userEmail, amount, transactionType, withdrawFrom } = req.body;

    // 1. ای میل کو کلین کریں (Spaces ختم کریں)
    const cleanEmail = userEmail.trim();

    if (transactionType === "Withdraw") {
      // 2. یوزر کو ڈھونڈیں (Case-Insensitive)
      const user = await User.findOne({ 
        email: { $regex: new RegExp("^" + cleanEmail + "$", "i") } 
      });

      if (!user) return res.status(404).json({ msg: "User not found" });

      let availableLimit = 0;
      const withdrawAmount = Number(amount);

      if (withdrawFrom === "Trading") {
        // ٹریڈنگ بیلنس ڈیٹا بیس سے لیں
        availableLimit = Number(user.tradingBalance || 0);
      } else {
        // ریفرل بیلنس کی کیلکولیشن
        const referrals = await User.find({ referredBy: cleanEmail });
        let totalRefEarned = 0;
        
        for (let ref of referrals) {
          const approvedDeposits = await Payment.find({
            userEmail: ref.email,
            status: "Approved",
            transactionType: "Deposit",
          });
          totalRefEarned += approvedDeposits.reduce((sum, p) => sum + (Number(p.amount) * 0.05), 0);
        }
        availableLimit = totalRefEarned - (Number(user.totalReferralWithdrawn) || 0);
      }

      // 3. فائنل بیلنس چیک
      if (availableLimit < withdrawAmount) {
        return res.status(400).json({ 
          msg: `Insufficient ${withdrawFrom} Balance. Database has $${availableLimit.toFixed(2)}` 
        });
      }
    }

    // 4. ریکویسٹ سیو کریں
    const newPayment = new Payment({
      ...req.body,
      userEmail: cleanEmail,
      status: "Pending"
    });

    await newPayment.save();
    res.status(200).json({ success: true, msg: "Withdrawal request submitted!" });

  } catch (err) {
    console.error("Payment Error:", err);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
};


const getUserHistory = async (req, res) => {

  try {

    const data = await Payment.find({ userEmail: req.params.email }).sort({

      date: -1,
      

    });

    res.status(200).json(data);

  } catch (err) {

    res.status(500).json({ msg: "Error" });

  }

};



const getAllPayments = async (req, res) => {

    try {

        // ہم پیمنٹس منگواتے وقت 'userEmail' کی بنیاد پر یوزر کلکشن سے فون اور کنٹری نکالیں گے

        const payments = await Payment.find().sort({ date: -1 });

       

        // اگر آپ نے ریفرنس (Ref) استعمال کیا ہے تو .populate('user') کریں

        // ورنہ فرنٹ اینڈ پر پروفائل بٹن والا طریقہ ہی سب سے بہتر ہے

        res.json(payments);

    } catch (err) {

        res.status(500).json(err);

    }

};

const deletePayment = async (req, res) => {

  try {

    await Payment.findByIdAndDelete(req.params.id);

    res.status(200).json({ msg: "Record Deleted" });

  } catch (err) {

    res.status(500).json({ msg: "Error" });

  }

};



const getUserBalance = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ریفرل کیلکولیشن
    const referrals = await User.find({ referredBy: email });
    let totalRefEarned = 0;
    for (let ref of referrals) {
      const approved = await Payment.find({
        userEmail: ref.email,
        status: "Approved",
        transactionType: "Deposit",
      });
      totalRefEarned += approved.reduce((sum, p) => sum + p.amount * 0.05, 0);
    }

    const currentRefBal = totalRefEarned - (user.totalReferralWithdrawn || 0);

    // فرنٹ اینڈ کے مطابق نام (Keys) بھیجیں
    res.json({
      tradingBalance: user.tradingBalance || 0,
      availableToWithdraw: currentRefBal, // فرنٹ اینڈ اسے ڈھونڈ رہا ہے
      referralEarnings: currentRefBal,
    });
  } catch (err) {
    res.status(500).json({ msg: "Error", error: err.message });
  }
};


// AdminController.js

const stopUserChallenge = async (req, res) => {

  try {

    const { email } = req.params;

    const { action } = req.body; // action: "Stopped" or "Active"



    await User.findOneAndUpdate({ email }, { challengeStatus: action });

    res.json({ success: true, msg: `Challenge ${action} successfully` });

  } catch (err) {

    res.status(500).json({ msg: "Error", error: err.message });

  }

};
// اس فنکشن کو ایکسپورٹ کریں تاکہ index.js میں استعمال ہو سکے
const approveWithdrawalFinal = async (req, res) => {
  const { paymentId, email, amount, withdrawFrom } = req.body;

  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ msg: "ریکارڈ نہیں ملا" });

    const user = await User.findOne({ email: email });
    if (!user) return res.status(404).json({ msg: "یوزر نہیں ملا" });

    const withdrawAmount = Number(amount);

    if (withdrawFrom === "Trading") {
      // 1. پہلے لائیو MT5 سے پیسے کاٹنے کی کوشش کریں
      try {
        const pythonResponse = await axios.post("http://localhost:5000/deduct_balance", {
          mt5_id: user.mt5Login,
          password: user.mt5Password,
          server: user.mt5Server,
          amount: withdrawAmount
        });
        console.log("✅ MT5 Success:", pythonResponse.data.message);
      } catch (pyError) {
        // اگر پائتھن ایرر دے تو یہیں رک جائیں
        const errorMsg = pyError.response?.data?.message || "MT5 connection failed";
        console.error("❌ MT5 Error:", errorMsg);
        return res.status(400).json({ msg: "MT5  " + errorMsg });
      }

      // 2. اگر MT5 سے کٹ گئے، تو ڈیٹا بیس اپ ڈیٹ کریں
      user.tradingBalance = (Number(user.tradingBalance) || 0) - withdrawAmount;
    } else {
      // ریفرل ود ڈرا کی صورت میں صرف ڈیٹا بیس اپ ڈیٹ کریں
      user.totalReferralWithdrawn = (Number(user.totalReferralWithdrawn) || 0) + withdrawAmount;
    }

    // پیمنٹ اسٹیٹس اپ ڈیٹ کریں
    payment.status = "Approved";
    await user.save();
    await payment.save();

    res.json({ success: true, msg: "رقم لائیو اکاؤنٹ اور ڈیٹا بیس دونوں سے کامیابی سے کٹ گئی" });
  } catch (error) {
    console.error("🔥 Global Error:", error);
    res.status(500).json({ msg: "سرور ایرر", error: error.message });
  }
};



module.exports = {
 approveWithdrawalFinal ,
  processPayment,

  getUserHistory,

  getAllPayments,

  updateStatus,

  deletePayment,

  getUserBalance,

  Payment,

  updateAdminSettings, // نیا شامل ہوا

  getAdminSettings,

  stopUserChallenge     // نیا شامل ہوا

};