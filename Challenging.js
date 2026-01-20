const mongoose = require("mongoose");

// Schema Definition
const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  balance: { type: String, required: true },
  prices: {
    single: { type: Number, default: 0 },
    double: { type: Number, default: 0 },
    triple: { type: Number, default: 0 }
  },
  leverage: { type: String, default:0 },
  profitTarget: { type: String, default: 0 },
  maxDrawdown: { type: String, default: 0 },
  dailyDrawdown: { type: String, default:0 },
  discount: { type: Number, default: 0 }, 
  timeLimit: { type: String, default: "Unlimited" },
  accountType: { type: String, default: "Standard" },
  profitShare: { type: String, required: true },
  isPopular: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const Challenge = mongoose.models.Challenge || mongoose.model("Challenge", challengeSchema);

// GET ALL
const getChallenges = async (req, res) => {
  try {
    const data = await Challenge.find().sort({ date: -1 });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching challenges" });
  }
};

// ADD NEW
const addChallenge = async (req, res) => {
  try {
    const newChallenge = new Challenge(req.body);
    await newChallenge.save();
    res.status(200).json({ msg: "Challenge added successfully!", data: newChallenge });
  } catch (err) {
    res.status(500).json({ msg: "Error saving challenge" });
  }
};

// UPDATE
const updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = await Challenge.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ msg: "Challenge updated successfully!", data: updatedData });
  } catch (err) {
    res.status(500).json({ msg: "Error updating challenge" });
  }
};

// DELETE
const deleteChallenge = async (req, res) => {
  try {
    await Challenge.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: "Challenge deleted successfully!" });
  } catch (err) {
    res.status(500).json({ msg: "Error deleting challenge" });
  }
};
const verifyEquityViolation = async (req, res) => {
    const { email, equity } = req.body;

    try {
        // 1. یوزر تلاش کریں
        const user = await User.findOne({ email: email });
        if (!user || user.status === "Terminated") {
            return res.json({ violated: false });
        }

        // 2. ایڈمن کا سیٹ کردہ چیلنج ڈھونڈیں (یوزر کے ٹارگٹ بیلنس کی بنیاد پر)
        // یہاں ہم وہ بیلنس میچ کر رہے ہیں جو ایڈمن نے "AdminChallenging.js" سے سیٹ کیا تھا
        const challenge = await Challenge.findOne({ balance: user.targetBalance });

        // اگر چیلنج مل جائے تو ایڈمن کی ویلیوز، ورنہ احتیاطاً ڈیفالٹ ویلیوز
        const initialBalance = challenge ? parseFloat(challenge.balance.replace(/[^0-9.]/g, '')) : 1000;
        
        // ایڈمن کی سیٹ کردہ % نکالیں (مثلاً اگر ایڈمن نے 10 لکھا ہے تو وہ 10 اٹھائے گا)
        const maxDDPercent = challenge ? parseFloat(challenge.maxDrawdown) : 6;
        const dailyDDPercent = challenge ? parseFloat(challenge.dailyDrawdown) : 4;

        // 3. کیلکولیشن (Admin کی ویلیوز کے مطابق)
        const maxLossAllowed = initialBalance * (maxDDPercent / 100);
        const dailyLossAllowed = initialBalance * (dailyDDPercent / 100);
        
        const minEquityAllowed = initialBalance - maxLossAllowed;
        const dailyLimit = initialBalance - dailyLossAllowed;

        const limitsData = {
            maxDD: maxDDPercent,
            dailyDD: dailyDDPercent,
            initialBalance: initialBalance
        };

        // 4. چیک کریں کہ کیا ایکویٹی ایڈمن کی لمٹ سے نیچے گئی؟
        if (equity <= minEquityAllowed || equity <= dailyLimit) {
            await User.findOneAndUpdate({ email: email }, { $set: { status: "Terminated" } });
            return res.json({ 
                violated: true, 
                message: `Account Terminated! Equity (${equity}) hit limit.`,
                limits: limitsData 
            });
        }

        res.json({ violated: false, limits: limitsData });
    } catch (err) {
        console.error("Violation Check Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { addChallenge, getChallenges, updateChallenge, deleteChallenge,verifyEquityViolation };