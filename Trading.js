const axios = require("axios");
const { User } = require("./User");

const PYTHON_URL = "http://localhost:5000";

const getFullAccountData = async (req, res) => {
    const { email } = req.query;
    try {
        const user = await User.findOne({ email });
        if (!user || !user.mt5Login) return res.status(404).json({ success: false, msg: "No Account" });

        const response = await axios.post(`${PYTHON_URL}/get_account_data`, {
            mt5_id: user.mt5Login,
            password: user.mt5Password,
            server: user.mt5Server
        });

        res.status(200).json({
            success: true,
            balance: response.data.balance,
            equity: response.data.equity,
            profit: response.data.profit,
            openTrades: response.data.positions
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Python Server Offline" });
    }
};

const getTradeHistory = async (req, res) => {
    const { email } = req.query;
    try {
        const user = await User.findOne({ email });
        const response = await axios.post(`${PYTHON_URL}/get_history`, {
            mt5_id: user.mt5Login, password: user.mt5Password, server: user.mt5Server
        });
        res.status(200).json({ success: true, history: response.data.history });
    } catch (error) {
        res.status(500).json({ success: false, error: "History fetch failed" });
    }
};

const linkNewMT5Account = async (req, res) => {
    const { email, login, password, server } = req.body;
    try {
        const response = await axios.post(`${PYTHON_URL}/get_account_data`, {
            mt5_id: login, password: password, server: server
        });
        if (response.data.status === "Success") {
            await User.findOneAndUpdate({ email }, { mt5Login: login, mt5Password: password, mt5Server: server, accountLinked: true });
            res.status(200).json({ success: true, msg: "Linked Successfully!" });
        } else {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Check Python Bridge" });
    }
};

// پرانے فنکشنز کو خالی کر دیا تاکہ ایرر نہ آئے
const getLiveAccountStats = getFullAccountData;
const autoLinkAccount = (req, res) => res.json({ success: true });
const updateUserTradingCreds = async (req, res) => res.json({ success: true });
const closeTrade = async (req, res) => {
    const { ticket } = req.body;
    try {
        const response = await axios.post(`${PYTHON_URL}/close_trade`, { ticket });
        res.status(200).json({ success: true, msg: response.data.message });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to close trade" });
    }
};
module.exports = { 
    getFullAccountData, 
    getTradeHistory, 
    linkNewMT5Account, 
    getLiveAccountStats, 
    autoLinkAccount, 
    updateUserTradingCreds,
    closeTrade // <--- یہ ایڈ کریں
};