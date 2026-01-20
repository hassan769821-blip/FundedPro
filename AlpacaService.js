const Alpaca = require('@alpacahq/alpaca-trade-api');

// Alpaca API کی چابیاں (Keys) جو آپ کو ان کے ڈیش بورڈ سے ملیں گی
const alpaca = new Alpaca({
  keyId: 'YOUR_API_KEY_ID',
  secretKey: 'YOUR_API_SECRET_KEY',
  paper: true, // ٹیسٹنگ (نکلی پیسوں) کے لیے ٹرو رکھیں
  usePolygon: false
});

// 1. نیا ٹریڈنگ اکاؤنٹ بنانے کا فنکشن
const createTradingAccount = async (userEmail) => {
  try {
    // کلاؤڈ پر اکاؤنٹ بنانے کی ریکوئسٹ
    const account = await alpaca.createAccount({
      contact: { email_address: userEmail },
      identity: { given_name: 'User', family_name: 'Name' },
      // دیگر ضروری معلومات...
    });
    return account;
  } catch (error) {
    console.error("Alpaca Account Error:", error.message);
  }
};

// 2. ایڈمن کی طرف سے بیلنس (Funds) ڈالنے کا فنکشن
const addFundsToAccount = async (accountId, amount) => {
  try {
    // کلاؤڈ سرور پر یوزر کے ورچوئل بیلنس کو اپڈیٹ کرنا
    const journal = await alpaca.post('/journals', {
      to_account: accountId,
      entry_type: 'CASH',
      amount: amount, // ایڈمن جتنا چاہے ڈال سکتا ہے
      currency: 'USD'
    });
    return journal;
  } catch (error) {
    console.error("Alpaca Funding Error:", error.message);
  }
};

module.exports = { createTradingAccount, addFundsToAccount };