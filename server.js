const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const userA = require("./modals/userModal");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const MiddlewareError = require("./middleware/error");
const jwt = require("jsonwebtoken"); // Import JWT library
const mongoose = require("mongoose"); // Import mongoose
const Order = require("./modals/orderModal"); // Import Order model
const path =require("path")
dotenv.config({ path: "./config/config.env" });

const SECRET_KEY =
  "OEDKFLJIHYJBAFCQAWSEDRFTGYHUJNIMXCDFVGBHNJDCFVGBHJN";



const allowedOrigins = ['http://localhost:3000','http://localhost:3001','https://www.dosomethings.in', 'https://frontenddo.vercel.app','https://admin-lovat-nu.vercel.app', 'https://frontenddo-b4wvilpg2-anish-stack.vercel.app'];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));

  
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(MiddlewareError);

// Database Connection
const connectDb = require("./config/database");
connectDb();

// Import controllers and middleware
const {
  registerUser,
  logout,
  updateUserRole,
  deleteUser,
  getAllUsers,
  getUserDetailsByEmail,
  getUserDetailsById,
  updateUserDetails,
  addReview,
  AlluserDel,
  changePassword,
  sendToken,
  sendOtpForLogin,
  loginUsertest,
  verifyOTPAndChangePassword,
} = require("./controller/userController");

// Imports for products controller
const {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  FilterProductsByKeywords,
  gettSingleProducts,
  searchProducts,
} = require("./controller/productControll");

// Imports for order controllers
const {
  newOrder,
  getOrdersByPhoneNumber,
  deleteOrdersWithZeroTotalPrice,
  singleorder,
  deleteOrdersWithNullItems,
  myOrderEmail,
  myOrder,
  allOrdersAdmin,
  changeStatus,
  deleteOrder,
  deleteProcessingOrders,
  totalPaymentamount,
  totalPaymentAmount,
  deleteAllOrdersAll,
} = require("./controller/orderController");

// Imports for payments
const stripeController = require("./controller/paymentController");

const {
  
  isAdmin,
  authenticateUser,
} = require("./middleware/auth");

// Users Routes
app.post("/register", registerUser);
app.get("/logout", authenticateUser, logout);
app.get("/user/id/:id", getUserDetailsById);
app.get("/user/email/:email",  getUserDetailsByEmail);
app.post("/products/:productId/reviews",  addReview);
app.post('/change-password',changePassword)
app.post('/verifyotp',verifyOTPAndChangePassword)
app.get("/getToken", sendToken);
app.post("/sendOtp", sendOtpForLogin);
app.post("/loginUserTest", loginUsertest);
app.post("/products/new",  createProduct);

// Admin routes (accessible only by admins)
app.patch("/user/email/:email", updateUserDetails);
app.patch("/user/:userId/role",  isAdmin, updateUserRole);
app.get("/users", getAllUsers);
app.delete("/users/delete/:userId", deleteUser);

// Routes for products
app.get("/products", getAllProducts); // Retrieve all products
app.post("/products/new",  createProduct); // Create a new product
app.put("/products/:id", updateProduct); // Update a product by ID
app.delete("/products/:id",  deleteProduct); // Delete a product by ID
app.get("/products/:id", gettSingleProducts); // Retrieve a single product by ID
app.get('/products/keywords/:keywords', FilterProductsByKeywords);
app.post("/order/new", newOrder);
app.get("/order/info/:id",  singleorder);
app.get("/me",  myOrder);
app.get("/meOrder/:email", myOrderEmail);
app.get("/allorder/:PhoneNo", getOrdersByPhoneNumber);
app.get('/products/search/:keyword', searchProducts);
// Admin routes for orders
app.get("/admin/orders", allOrdersAdmin);
app.patch("/changeStatus/:id",   changeStatus);
app.delete("/deleteorder/:id",   deleteOrder);
app.delete("/user/cancel/:id",  deleteOrder);
app.get("/admin/delete", deleteProcessingOrders);
app.delete("/delete-orders-with-null-items", deleteOrdersWithNullItems);
app.delete("/delete-orders-with-total-price-zero", deleteOrdersWithZeroTotalPrice);
app.get("/paymentDone", totalPaymentAmount);
app.delete("/allDelete", deleteAllOrdersAll);

// Payments routes
app.post("/payment/process", stripeController.processPayment);
app.get("/stripeapikey", stripeController.sendStripeApiKey);

// Activation route
app.get('/activate', async (req, res) => {
  try {
      const { token } = req.query;
    console.log(req.query)
      // Find the user with the provided token
      const user = await userA.findOne({ activationtoken: token });
      console.log(user)

      if (!user) {
          // Handle the case where the token does not match any user
          throw new ErrorHandler('Invalid or expired activation token', 400);
      }

      // Check if the token has expired
      if (user.activationtokenExpires <= Date.now()) {
          // Handle the case where the token has expired
          throw new ErrorHandler('Activation token has expired', 400);
      }

      // Activate the user's account
      user.isActivated = true;
      await user.save();

      // Redirect the user to a success page or display a success message
      res.status(200).json({ message: 'Account activated successfully' });
  } catch (error) {
      // Handle errors
      console.error('Error:', error);
      res.status(error.statusCode || 500).json({ error: error.message });
  }
})

// Route to verify a token
app.post("/api/v1/verifyToken", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is missing." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return res.status(200).json({ message: "Token verified successfully." });
  } catch (error) {
    return res.status(401).json({ message: "Token verification failed." });
  }
});

// Download order invoice route
// app.get("/api/v1/orders/:orderId/download", async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.orderId);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.download(order.invoicePath);
//   } catch (error) {
//     res.status(500).json({ message: "Internal server error" });
//   }
// });


//sucesss Routes
app.get("/success", (req, res) => {
  const filePath = path.join(__dirname, "/temeplete/passwordsucess.html"); // Change "success.html" to your actual file name
  res.sendFile(filePath);
});

// Root route
app.get("/", (req, res) => {
  res.send("Hello, I am from the backend");
});

// Start the server
const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log("Server is running on port number", port);
});

// Unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  // Gracefully shutdown the server and exit
  server.close(() => {
    process.exit(1);
  });
});
