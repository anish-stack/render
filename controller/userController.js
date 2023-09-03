const sendEmail = require("../utils/mailSend");
const sendTokenMail =require("../utils/passwordRestmail")
const axios = require("axios");
const user = require("../modals/userModal");
const User = require("../modals/userModal");
const jwt = require("jsonwebtoken");
const sendToken = require("../utils/jwt");
const nodemailer = require("nodemailer");
const OTPGenerator = require('otp-generator');
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const ErrorHandler = require("../utils/errorHandler");

const sendErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  res.status(statusCode).json({ success: false, error: message });
};


const catchAsyncErrors = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => sendErrorResponse(res, error));
  };
};

// Function to generate avatar URL based on the user's name
async function generateAvatarUrl(name) {
  const response = await axios.get(
    `https://avatars.dicebear.com/api/human/${name}.svg`
  );
  return response.data;
}

// Middleware to verify JWT token
exports.sendToken = catchAsyncErrors(async (req, res) => {
  const StoredToken = req.cookies.token;
  // check token is present or not
  if (!StoredToken) {
    return res.status(401).json({ message: "Please login" });
  } else {
    return res.status(200).json({
      StoredToken,
      message: "Your Token",
    });
  }
});

// Register user

exports.registerUser = catchAsyncErrors(async (req, res) => {
  try {
    const { name, email, password, role, contactNumber } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Generate a unique activation token
    const activationToken = crypto.randomBytes(32).toString("hex");

    // Set the expiration time to 20 minutes from now
    const expirationTime = new Date(Date.now() + 20 * 60 * 1000);
    const avatar = await generateAvatarUrl(name);
    // Create a new user with the activation token and expiration time
    const newUser = new User({
      name,
      email,
      password,
      role,
      avatar,
      contactNumber,
      activationToken,
      isActivated: false, // Initially set to false
      activationTokenExpires: expirationTime, // Store the expiration time
      dateOfJoin: Date.now(),
    });

    // Set a timer to delete the user after 20 minutes
    exports.deletionTimeout = setTimeout(async () => {
      try {
        const userToDelete = await User.findOne({ _id: newUser._id });
        if (userToDelete && !userToDelete.isActivated) {
          await User.deleteOne({ _id: newUser._id }); // Delete the user document
          console.log(
            `Deleted user ${userToDelete.email} due to expired activation token.`
          );
        }
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }, 900000); // 1 minute in milliseconds

    // Construct the activation link
    const activationLink = `${
      process.env.BASE_URL
    }/activate?token=${encodeURIComponent(activationToken)}`;

    // Log the activation link to the console
    console.log("Activation Link:", activationLink);

    // Send registration activation email with the activation link
    const emailOptions = {
      email: newUser.email,
      subject: "Activate Your Account",
      message: `Click the following link to activate your account: ${activationLink}`,
    };
    await sendEmail(emailOptions, activationLink); // Pass the activation link as an argument

    // Assuming you have a sendEmail function to send emails
    await newUser.save();
    res.status(201).json({
      message:
        "User registered successfully. An activation email has been sent.",
      newUser,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Login User


exports.sendOtpForLogin = async (req, res, next) => {
  try {
    // Generate a random OTP
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP and expiration time in user record
    const user = await User.findOne({ email: req.body.email });
    user.otp = generatedOTP;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
    await user.save();

    // Send OTP to user's email
    const emailOptions = {
      email: user.email,
      subject: "Your OTP for Login",
      message: `Your OTP for login is: ${generatedOTP}`,
    };
    await sendEmail(emailOptions);
    console.log("OTP sent:", generatedOTP); 
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Error sending OTP" });
  }
};


// exports.loginUser = catchAsyncErrors(async (req, res, next) => {
//   try {
//     const { email, otp } = req.body;

//     // Checking if user has given both email and OTP
//     if (!email || !otp) {
//       return sendErrorResponse(res, new ErrorHandler("Please Enter Email & OTP", 400));
//     }

//     const user = await User.findOne({ email });

//     if (!user) {
//       return sendErrorResponse(res, new ErrorHandler("Invalid email or OTP", 401));
//     }

//     await user.save();

//     // Generate and send JWT token for login
//     sendToken(user, 200, res);
//   } catch (error) {
//     console.error("Error during login:", error);
//     res.status(500).json({ error: "An error occurred" });
//   }
// });
exports.loginUsertest = catchAsyncErrors(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user with the given email
    const user = await User.findOne({ email });

    // If no user is found, return an error
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if the provided password matches the user's password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log("Password mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if the user's account is activated
    if (!user.isActivated) {
      console.log("Account not activated");
      return res.status(403).json({ error: "Account not activated" });
    }

    // At this point, the user is authenticated
    // You can generate a JWT token and send it as a response
    sendToken(user, 200, res);
    console.log("Login successful");

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});


exports.logout = catchAsyncErrors(async (req, res, next) => {
  // Clear the token cookie on the client-side
  res.clearCookie("token"); // Remove the cookie

  // Send a successful response
  res.status(200).json({
    success: true,
    message: "Logged Out",
  });
});

// Get user details by ID=======================================================================================
exports.getUserDetailsById = catchAsyncErrors(async (req, res, next) => {
  const userId = req.params.id; // Assuming the user ID is provided as a route parameter

  // Find the user by ID
  const foundUser = await user.findById(userId);

  if (!foundUser) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: foundUser,
  });
});
// Get user details by email==========================================================================================
exports.getUserDetailsByEmail = catchAsyncErrors(async (req, res, next) => {
  const userEmail = req.params.email; // Assuming the user email is provided as a route parameter

  // Find the user by email
  const foundUser = await user.findOne({ email: userEmail });

  if (!foundUser) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: foundUser,
  });
});

//================================================================================================= updateUserDetails
exports.updateUserDetails = catchAsyncErrors(async (req, res, next) => {
  const userEmail = req.params.email; // Assuming the user email is provided as a route parameter

  // Find the user by email using an object as the filter
  let foundUser = await user.findOne({ email: userEmail });

  if (!foundUser) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Update the user details with the provided data
  foundUser.name = req.body.name || foundUser.name;
  foundUser.email = req.body.email || foundUser.email;

  if (req.body.avatar) {
    foundUser.avatar = {
      public_id: "sample_id", // You can use the ID provided by the user's uploaded image
      url: "new_avatar_url", // The new URL of the avatar
    };
  }

  await foundUser.save();

  res.status(200).json({
    success: true,
    data: foundUser,
  });
});

// Function to update user role by admin//================================================================================================= updateUserDetails

exports.updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    // Find the user by their ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user role
    user.role = role;
    await user.save();

    res.json({ message: "User role updated successfully", user });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// Function to get all user data (for admin)//================================================================================================= updateUserDetails

exports.getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    // Count the total number of users
    const totalCount = await User.countDocuments();

    // Calculate total pages based on total users and limit
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch users based on pagination
    const users = await User.find({}, "-password")
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Function to delete a user by ID (for admin)//================================================================================================= updateUserDetails

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if the user with the specified ID exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user from the database
    await user.remove();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
//================================================================================================= updateUserDetails

// In this controller function, we use User.findById() to check if the user with the specified ID exists. If the user is found, we use user.remove() to delete the user from the database.
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if the user with the specified ID exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user from the database
    await user.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// =============================reviewconst products = require("./modals/productModal");
const Product = require("../modals/productModal");

// Controller function to add a review and rating to a product
exports.addReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, review, name } = req.body;
  const productId = req.params.productId;
  const userId = req.user._id;

  // Find the product by ID
  const product = await Product.findById(productId);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check if the user has already reviewed the product
  const existingReview = product.reviews.find((r) => r.user.equals(userId));

  if (existingReview) {
    return next(
      new ErrorHandler("You have already reviewed this product", 400)
    );
  }

  // Add the new review and rating to the product
  product.reviews.push({
    user: userId,
    name, // The name of the user (optional)
    rating,
    comment: review,
  });

  // Update the product's rating and number of reviews
  product.numOfReviews = product.reviews.length;
  product.ratings =
    product.reviews.reduce((total, review) => total + review.rating, 0) /
    product.numOfReviews;

  await product.save();

  res.status(201).json({ success: true, message: "Review added successfully" });
});

exports.AlluserDel = catchAsyncErrors(async (req, res) => {
  try {
    const deletedUsers = await User.deleteMany({ role: "user" });
    res.json({
      message: `${deletedUsers.deletedCount} users with role 'user' deleted`,
    });
  } catch (error) {
    console.error("Error deleting users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// [password change]

exports.changePassword = catchAsyncErrors(async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    // If user not found, return an error
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Generate a unique reset password token
    const resetPasswordToken = crypto.randomBytes(32).toString("hex");

    // Set the expiration time for the reset password token
    const resetPasswordTokenExpires = new Date(Date.now() + 20 * 60 * 1000);

    // Update the user's reset password token details
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordTokenExpires = resetPasswordTokenExpires;

    // Save the user document with the updated token details
    await user.save();

    // Construct the password reset link
    const resetPasswordLink = `${
      process.env.BASE_URL
    }/reset-password?token=${encodeURIComponent(resetPasswordToken)}`;
    console.log(resetPasswordLink)
    // Send password reset email
    const restToken = {
      email: user.email,
      subject: "Reset Your Password",
      message: `Click the following link to reset your password: ${resetPasswordLink}`,
    };
    await sendTokenMail(restToken, resetPasswordLink);

    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
