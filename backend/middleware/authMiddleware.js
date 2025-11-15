import jwt from "jsonwebtoken";
import  UserModel  from "../model/UserModel.js";
import dotenv from "dotenv";

dotenv.config();

// JWT authentication middleware
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log(req.headers)
  if (!authHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Access token required" });
  }

  try {
    // Support both raw token and "Bearer <token>"
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded; // Attach user information to the request object
    
    // Update lastSeenAt as a heartbeat (non-blocking)
    if (decoded.userId) {
      UserModel.findByIdAndUpdate(
        decoded.userId,
        { lastSeenAt: new Date() },
        { new: true }
      ).catch(err => {
        // Silently fail - don't block the request if heartbeat fails
        console.error("Heartbeat update failed:", err);
      });
    }
    
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: err.message });
  }
};

// Role validation middleware
export const authorizeRole = (...requiredRoles) => {
  const roleMapping = {
    admin: "1",
    superadmin: "0",
    employee: "2",
  };

  return async (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const user = await UserModel.findById(req.user.userId);
    
    // Translate the required roles to their database values
    const allowedRoles = requiredRoles.map((role) => roleMapping[role]);
  
    // Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions",
      });
    }

    next();
  };
};

export default authenticate;
