const stripe = require('stripe')("sk_test_51NdrqMSIJQipzpwwdH0tF6G0UdCe1rR1NyiSfUybwSkhX0tOJbLnxtCsUM0h6MkHRCmCaZsmcVawqqZf5wPpLcFs007mpj45zw");
// const ErrorHandler = require('../middleware/error');
const Payment = require("../modals/payement")
// =====Catch Async error
const catchAsyncErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


exports.processPayment = catchAsyncErrors(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount provided" });
  }

  try {
    const myPayment = await stripe.paymentIntents.create({
      amount: amount,
      currency: "INR",
      metadata: {
        company: "Ecommerce",
      },
    });

    res.status(200).json({ success: true, client_secret: myPayment.client_secret });


  } catch (error) {
    console.error("Error fetching client secret:", error.message);
    res.status(400).json({ error: "Error fetching client secret" });
  }
});

exports.sendStripeApiKey = catchAsyncErrors(async (req, res, next) => {
  res.status(200).json({ stripeApiKey: process.env.Stripe_SECRECT_KEY });
});
