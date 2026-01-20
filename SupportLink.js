const mongoose = require('mongoose');

// --- 1. Schema & Model ---
const supportLinkSchema = new mongoose.Schema({
    whatsapp: { url: { type: String, default: "" }, active: { type: Boolean, default: true } },
    youtube: { url: { type: String, default: "" }, active: { type: Boolean, default: true } },
    instagram: { url: { type: String, default: "" }, active: { type: Boolean, default: true } },
    telegram: { url: { type: String, default: "" }, active: { type: Boolean, default: true } }
});

// Model banate waqt check karein ke kahin pehle se to nahi bana hua
const SupportLink = mongoose.models.SupportLink || mongoose.model('SupportLink', supportLinkSchema);

// --- 2. Controllers ---

// لنکس حاصل کرنے کے لیے
const getLinks = async (req, res) => {
    try {
        let links = await SupportLink.findOne();
        if (!links) {
            // Agar pehle se koi data nahi hai to default bana dega
            links = await SupportLink.create({
                whatsapp: { url: "", active: true },
                youtube: { url: "", active: true },
                instagram: { url: "", active: true },
                telegram: { url: "", active: true }
            });
        }
        res.json(links);
    } catch (err) {
        res.status(500).json({ error: "Links fetch failed" });
    }
};

// لنکس اپڈیٹ کرنے کے لیے
const updateLinks = async (req, res) => {
    try {
        const updatedLinks = await SupportLink.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        res.json(updatedLinks);
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
};

// --- 3. Exports ---
module.exports = { getLinks, updateLinks }; 