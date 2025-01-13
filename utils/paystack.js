const axios = require("axios");

const Paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "content-type": "application/json",
    "cache-control": "no-cache",
  },
});

// fetch banks
const fetchBanks = () => Paystack.get("/bank?currency=NGN");
const add = () => Paystack.get("/bank?currency=NGN");

// validated customer account detail
const validateAccount = (accountNumber, bankCode) =>
  Paystack.get(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  );

// creating a transfer recipient
const transferRecipient = (values) =>
  Paystack.post("/transferrecipient", values);

// transfer funds to customer
const transfer = (values) => Paystack.post("/transfer", values);

module.exports = {
  Paystack,
  fetchBanks,
  validateAccount,
  transferRecipient,
  transfer,
};
