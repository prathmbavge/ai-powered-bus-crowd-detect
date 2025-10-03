const jwt = require("jsonwebtoken");

// Middleware to verify JWT token
module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;

    // If role not present in token, fetch it from database (for backward compatibility)
    if (!req.user.role) {
      const User = require("../models/User");
      const user = await User.findById(req.user.id).select("role");
      if (user) {
        req.user.role = user.role;
      }
    }

    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};
