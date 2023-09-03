// models/payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  // Add more fields as needed
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
