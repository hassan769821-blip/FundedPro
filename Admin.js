const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();


const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});
const Admin = mongoose.model("Admin", adminSchema);

const leaderboardItemSchema = new mongoose.Schema({
 category: { type: String, required: true },
 rank: { type: Number, required: true },
 name: { type: String, required: true },
 

 payout: Number,
 type: String,
 payouts: Number,
 platform: String,
 date: String, 
 

  profit: Number,
  gain: String,
  accountSize: String,
  country: String,
  

  winRatio: String, 
  trades: Number,
  timeToComplete: String, 
  challengeName: String,
  startDate: String,
  endDate: String,


  symbol: String, 
  entryExit: String,
  lotSize: String,
  challengeAccount: String,
});

const LeaderboardItem = mongoose.models.LeaderboardItem || mongoose.model("LeaderboardItem", leaderboardItemSchema);


const seedAdmin = async () => {
  const exists = await Admin.findOne({ email: "hassan@gmail.com" });
  if (!exists) {
    const admin = new Admin({ email: "hassan@gmail.com", password: "hassan123" });
    await admin.save();
    console.log("Admin seeded");
  }
};
seedAdmin();



router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email, password });
  if (!admin) return res.status(401).json({ msg: "Invalid email or password" });
  res.json({ msg: "success" });
});


router.get("/leaderboard/:category", async (req, res) => {
  const { category } = req.params;
  const items = await LeaderboardItem.find({ category: decodeURIComponent(category) }).sort({ rank: 1 });
  res.json(items);
});


router.get("/admin/leaderboard/all", async (req, res) => {
    // Sort by category first, then by rank
    const items = await LeaderboardItem.find().sort({ category: 1, rank: 1 });
    res.json(items);
});

// Add leaderboard item (Admin Panel use)
router.post("/admin/leaderboard/add", async (req, res) => {
  try {
    const newItem = new LeaderboardItem(req.body);
    await newItem.save();
    res.json({ msg: "Item added successfully", item: newItem });
  } catch (error) {
    res.status(500).json({ msg: "Failed to add item", error: error.message });
  }
});

// Delete leaderboard item (Admin Panel use)
router.delete("/admin/leaderboard/delete/:id", async (req, res) => {
  const { id } = req.params;
  const result = await LeaderboardItem.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ msg: "Item not found" });
  res.json({ msg: "Item deleted successfully" });
});

module.exports = router;