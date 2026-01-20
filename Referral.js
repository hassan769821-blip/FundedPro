const mongoose = require("mongoose");

const getReferralStats = async (req, res) => {
  try {
    const { email } = req.params;
    
    // یوزر اور پیمنٹ ماڈلز کا حوالہ حاصل کریں
    const User = mongoose.model("User");
    let Payment;
    try {
        Payment = mongoose.model("Payment");
    } catch (e) {
        Payment = mongoose.models.Payment; 
    }

    // 1. ریفر کرنے والے یوزر کا ڈیٹا نکالیں
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 2. وہ تمام دوست ڈھونڈیں جنہوں نے اس کے لنک سے جوائن کیا
  // Referral.js میں اس لائن کو تبدیل کریں
const referrals = await User.find({ 
  referredBy: { $regex: new RegExp(`^${email}$`, "i") } 
});

    let totalEarnings = 0;
    
    // 3. ہر دوست کی 'Approved' پیمنٹس پر 5% کمیشن نکالیں
    const referralList = await Promise.all(referrals.map(async (refUser) => {
      
      // پیمنٹ کلیکشن میں اس دوست کی تمام Approved پیمنٹس نکالیں
      const approvedPayments = await Payment.find({ 
        userEmail: refUser.email, 
        status: "Approved" 
      });

      // رقم کا مجموعہ (Sum)
      const sumApproved = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      // 5 فیصد کمیشن
      const userCommission = sumApproved * 0.05; 
      totalEarnings += userCommission;

      return {
        name: refUser.name,
        email: refUser.email,
        commission: userCommission.toFixed(2), // 2 decimals تک
        paidAmount: sumApproved 
      };
    }));

    // 4. فائنل ڈیٹا فرنٹ اینڈ کو بھیجیں
    res.json({
      msg: "success",
      referralCode: email, 
      totalReferrals: referrals.length,
      // کل کمائی میں سے وہ رقم مائنس کریں جو یوزر پہلے ہی نکلوا چکا ہے
      totalEarnings: parseFloat((totalEarnings - (user.totalReferralWithdrawn || 0)).toFixed(2)), 
      referralList: referralList
    });

  } catch (err) {
    console.error("Referral Error:", err);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
};

module.exports = { getReferralStats };