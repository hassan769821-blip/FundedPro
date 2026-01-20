const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer"); // nodemailer شامل کیا

// 1. User Schema Definition
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lastName: { type: String, default: "" }, // نیا اضافہ
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
 referredBy: { type: String, default: null },
tradingBalance: { type: Number, default: 0 }, // یہ شامل کریں
  totalReferralWithdrawn: { type: Number, default: 0 },
  mobile: { type: String, default: "" },  // نیا اضافہ
  address: { type: String, default: "" }, // نیا اضافہ
  city: { type: String, default: "" },    // نیا اضافہ
  timezone: { type: String, default: "UTC-12:00" }, // نیا اضافہ
  postalCode: { type: String, default: "" }, // نیا اضافہ
  state: { type: String, default: "" },   // نیا اضافہ
  country: { type: String, default: "PK" },
  
  mt5Login: { type: String, default: "" },
  mt5Password: { type: String, default: "" },
  mt5Server: { type: String, default: "MetaQuotes-Demo" },
  amplifierId: { type: String, default: null },
  accountLinked: { type: Boolean, default: false }, // نیا اضافہ
  // ... باقی پرانی فیلڈز وہی رہیں گی
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// یہ آپ کے کنٹرولر یا راؤٹس میں جائے گا
const updateProfile = async (req, res) => {
  try {
    const { email, ...updateData } = req.body;
    await User.findOneAndUpdate({ email }, { $set: updateData });
    res.json({ msg: "success" });
  } catch (err) {
    res.status(500).json({ msg: "error" });
  }
};

// OTP Schema (اضافہ کیا گیا)
const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } // 5 منٹ میں ختم ہو جائے گا
});
const OTP = mongoose.model("OTP", otpSchema);

// Nodemailer Config (اضافہ کیا گیا)
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "developerpro58@gmail.com",
    pass: "rtbrbehkftlwdcwj",
  },
});

/* ================= SEND OTP (نیا فنکشن) ================= */
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.json({ msg: "already exist" });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email });
    await new OTP({ email, otp: otpCode }).save();

    await transporter.sendMail({
      from: '"Verification" <developerpro58@gmail.com>',
      to: email,
      subject: "Your Signup Code",
      text: `Your OTP code is: ${otpCode}`,
    });
    res.json({ msg: "otp_sent" });
  } catch (err) {
    res.status(500).json({ msg: "error" });
  }
};

/* ================= SIGNUP (Save Data) - Updated with OTP ================= */
const saveData = async (req, res) => {
  try {
    const { name, email, password, referredBy, otp } = req.body; // otp شامل کیا

    // OTP ویریفکیشن (اضافہ کیا گیا)
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) return res.json({ msg: "invalid otp" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.json({ msg: "already exist" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      referredBy: referredBy || null,
    });

    await newUser.save();
    await OTP.deleteMany({ email }); // کوڈ استعمال ہونے کے بعد ڈیلیٹ کر دیں
    res.json({ msg: "done" });
  } catch (err) {
    res.status(500).json({ msg: "error" });
  }
};

/* ================= LOGIN ================= */
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: "error" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ msg: "error" });

    const { password: _, ...userData } = user._doc;
    res.json({ msg: "success", data: userData });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* ================= UPDATE PASSWORD ================= */
const updatePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: "Email not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.json({ msg: "Old password incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ msg: "Password update successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* ================= GET USER PROFILE ================= */
const getUserProfile = async (req, res) => {
    try {
        // ای میل کے ذریعے پورا یوزر ڈھونڈیں
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ msg: "User not found" });
        
        // پاس ورڈ کے علاوہ تمام ڈیٹا بھیجیں
        const { password, ...userData } = user._doc;
        res.json(userData);
    } catch (err) {
        res.status(500).json({ msg: "Server Error" });
    }
};

module.exports = { User, saveData, userLogin, updatePassword, getUserProfile, sendOTP, updateProfile };