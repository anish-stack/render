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

const deleteUnactivatedUsers = async () => {
  try {
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

    const unactivatedUsers = await User.find({
      isActivated: false,
      createdAt: { $lt: twentyMinutesAgo },
    });

    for (const user of unactivatedUsers) {
      await User.remove();
      console.log(`Deleted unactivated user with email: ${user.email}`);
    }
  } catch (error) {
    console.error("Error deleting unactivated users:", error);
  }
};
// Register user

exports.registerUser = catchAsyncErrors(async (req, res) => {
  const { name, email, contact, password, confirmpassword, role } = req.body;

  console.log(req.body);

  try {
    // Check if a user with the same email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ErrorHandler("User already exists with this Email Id", 400);
    } else if (!name || !email || !contact || !password || !confirmpassword) {
      throw new ErrorHandler("Please Fill All Fields", 422);
    }

    if (password !== confirmpassword) {
      throw new ErrorHandler("Confirm Password Not Match", 422);
    }

    const activationtoken = crypto.randomBytes(20).toString("hex");
    const activationtokenExpires = new Date(Date.now() + 20 * 60 * 1000);

    const newUser = new User({
      username: name, // Change 'username' to 'name'
      email,
      contactNumber: contact, // Change 'contactNumber' to 'contact'
      password,
      confirmPassword: confirmpassword, // Change 'confirmPassword' to 'confirmpassword'
      role,
      isActivated: false,
      activationtoken,
      activationtokenExpires,
    });

    const activationLink = `https://dosomethingbackend.vercel.app/activate?token=${encodeURIComponent(activationtoken)}`;

    await sendEmail(
      {
        email: newUser.email,
        subject: "Activate Your Account",
        message: `Click the following link to activate your account: ${activationLink}`,
      },
      activationLink
    );

    console.log(activationLink);
    await newUser.save();
    res.status(201).json({
      message: "User registered successfully. An activation email has been sent.",
      newUser,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

setInterval(deleteUnactivatedUsers, 20 * 60 * 1000);

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


exports.loginUsertest = catchAsyncErrors(async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(req.body)

    if (!email || !password) {
      throw new ErrorHandler("Please Enter Email And Password", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new ErrorHandler("User With this Email Not Existed", 404);
    }

    if (!user.isActivated) {
      throw new ErrorHandler("User Not Activated", 403);
    }

    // Use bcrypt to compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new ErrorHandler("Password Mismatch", 401);
    }

    const payload = {
      email: user.email,
      id: user._id, // Fix this typo, it should be _id, not _id
      role: user.role,
    };

    const token = jwt.sign(payload,"OEDKFLJIHYJBAFCQAWSEDRFTGYHUJNIMXCDFVGBHNJDCFVGBHJN", {
      expiresIn: "7h",
    });

    // Remove the password from the user object before sending it in the response
    user.password = undefined;

    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    res.cookie("token", token, options).status(200).json({
      success: true,
      token,
      user,
      message: "Logged in successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
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
    const user = await User.findOne({ email });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Existed",
      });
    }

    // Generate a random four-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Save the OTP and its expiration time in the user object
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = new Date(Date.now() + 20 * 60 * 1000);

    // Send the OTP to the user's email
    const payload = {
      email: user.email,
      subject: "Reset Password OTP",
      message: `Your OTP to reset your password is: ${otp}`,
    };

    // Send the OTP via email
    // console.log(payload)
    await sendEmail(payload);
    await user.save();

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
exports.verifyOTPAndChangePassword = catchAsyncErrors(async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Existed",
      });
    }

    // Check if the OTP matches and it's not expired
    if (
      user.resetPasswordOTP !== otp ||
      new Date() > user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP or OTP has expired",
      });
    }

    // Reset the OTP and set the new password
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    user.password = newPassword;

    // Save the updated user object
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
