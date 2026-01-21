const Alpaca = require('@alpacahq/alpaca-trade-api');


const alpaca = new Alpaca({
  keyId: 'YOUR_API_KEY_ID',
  secretKey: 'YOUR_API_SECRET_KEY',
  paper: true, 
  usePolygon: false
});

const createTradingAccount = async (userEmail) => {
  try {
    const account = await alpaca.createAccount({
      contact: { email_address: userEmail },
      identity: { given_name: 'User', family_name: 'Name' },
    });
    return account;
  } catch (error) {
    console.error("Alpaca Account Error:", error.message);
  }
};
const addFundsToAccount = async (accountId, amount) => {
  try {
    const journal = await alpaca.post('/journals', {
      to_account: accountId,
      entry_type: 'CASH',
      amount: amount, 
      currency: 'USD'
    });
    return journal;
  } catch (error) {
    console.error("Alpaca Funding Error:", error.message);
  }
};

module.exports = { createTradingAccount, addFundsToAccount };
