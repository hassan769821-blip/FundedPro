const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const { saveData, userLogin, updatePassword, getUserProfile, sendOTP, updateProfile, } = require("./User");
// اس لائن کو اپڈیٹ کریں
const { addChallenge, getChallenges, updateChallenge, deleteChallenge, checkViolation, verifyEquityViolation } = require("./Challenging");
const { processPayment, getUserHistory, getAllPayments, updateStatus, deletePayment, getUserBalance, getAdminSettings, updateAdminSettings, stopUserChallenge, approveWithdrawalFinal } = require("./Payment");
const adminRoutes = require("./Admin");
const { getReferralStats } = require("./Referral");

const { User } = require("./User");
const { 
  getLiveAccountStats, 
  getTradeHistory, 
  linkNewMT5Account, 
  autoLinkAccount,
  getFullAccountData,  // <-- یہ لازمی شامل کریں
  updateUserTradingCreds,
  linkUserAccount
} = require('./Trading');

const { askGemini } = require("./aiController");
const { getLinks, updateLinks } = require('./SupportLink');

const app = express();


app.use(cors());
app.use(express.json({ limit: '50mb' }));  
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose
  .connect("mongodb+srv://hassan769821_db_user:h.769821@cluster0.fqw0d8w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("DB Connection Error:", err));

  app.post("/ask-ai", askGemini);
app.get("/get-support-links", getLinks);
app.post("/update-support-links", updateLinks);


app.post("/process-payment", processPayment);
app.get("/payment-history/:email", getUserHistory);
app.get("/all-payments", getAllPayments);
app.put("/update-payment-status/:id", updateStatus);
app.delete("/delete-payment/:id", deletePayment);
app.get("/user-balance/:email", getUserBalance);
app.post("/update-admin-settings", updateAdminSettings);
app.get("/get-admin-settings", getAdminSettings);
app.post("/approve-withdrawal-final", approveWithdrawalFinal);




app.post("/savedata", saveData);
app.post("/userLogin", userLogin);
app.put("/updatepassword", updatePassword);
app.get("/user-data/:email", getUserProfile)
app.get("/get-challenges", getChallenges);
app.post("/add-challenge", addChallenge);
app.put("/update-challenge/:id", updateChallenge);
app.delete("/delete-challenge/:id", deleteChallenge);
app.put("/updateProfile", updateProfile);
app.post('/send-otp', sendOTP);
// index.js میں شامل کریں
app.put("/stop-challenge/:email", stopUserChallenge);

app.get("/api/referral-stats/:email", getReferralStats);
// ان روٹس کو اپنے app.js میں اپڈیٹ کریں
app.get('/getFullAccountData', getFullAccountData); // <-- یہ روٹ مسنگ تھا
app.get('/getLiveAccountStats', getLiveAccountStats);
app.get('/getTradeHistory', getTradeHistory);
app.post('/link-account', linkNewMT5Account);
app.post("/update-user-trading-creds", updateUserTradingCreds);
app.get('/auto-link', autoLinkAccount);
app.post("/api/verify-equity", verifyEquityViolation);
// index.js یا جہاں آپ نے یہ راؤٹ بنایا ہے


app.use("/", adminRoutes);

app.listen(3000, () => {
    console.log("Server running on port 3000 and Gemini AI is ready!");
}); 