const ErrorHander = require("../utils/errorHandler");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser")
const User = require("../modals/userModal");
const catchAsyncErrors = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };


  exports.authenticateToken = catchAsyncErrors(async(req, res, next)=>{
    const token = req.headers.authorization?.split(' ')[1];

    console.log(token)
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      const decodedToken = jwt.verify(token, secretKey);
      req.user = decodedToken; // Attach user information to the request
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  })  
  
  

  exports.isAuthenticatedUser = async (req, res, next) => {
    const token = req.headers.authorization;
  
    if (!token) {
      return res.status(401).json({ error: 'Please login to access this resource' });
    }
  
    try {
      const decodedData = jwt.verify(token, 'your-secret-key'); // Replace with your actual secret key
      req.user = await User.findById(decodedData.id); // Assuming you have a User model
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Please login to access this resource' });
    }
  };
  
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHander(
          `Role: ${req.user.role} is not allowed to access this resouce `,
          403
        )
      );
    }

    next();
  };
};

exports.isAdmin = (req, res, next) => {
  // Assuming req.user contains the authenticated user data from the isAuthenticatedUser middleware
  if (req.user && req.user.role === 'admin') {
    next(); // User is an admin, proceed to the next middleware or route handler
  } else {
    res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }
};

exports.authenticateUser = (req, res, next) => {
  const token = req.cookies.token; // Assuming the token is stored in a cookie

  if (token) {
    try {
      const decoded = jwt.verify(token, "OEDKFLJIHYJBAFCQAWSEDRFTGYHUJNIMXCDFVGBHNJDCFVGBHJN");
      req.user = decoded; // Attach user information to req.user
    } catch (error) {
      // Handle invalid token or token expiration
      console.error("Token verification error:", error);
    }
  }

  next();
};

