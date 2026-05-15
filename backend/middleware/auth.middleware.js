import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Pandit from "../models/pandit.model.js";

const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ Get token
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ❌ No token
    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Fetch user
    const user = await User.findById(decoded.id).select("-otp -otpExpires");

    // ❌ If user deleted
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked. Please contact support.",
      });
    }

    // Attach user
    req.user = user;

    next();

  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default protect;

export const protectUserOrPandit = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const actorId = decoded?.id;

    if (!actorId) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Pandit token carries role=pandit; otherwise treat as user token.
    if (decoded?.role === "pandit") {
      const pandit = await Pandit.findById(actorId);
      if (!pandit) {
        return res.status(401).json({ message: "Pandit not found" });
      }
      req.pandit = pandit;
      req.actor = { id: pandit._id, role: "pandit" };
      return next();
    }

    const user = await User.findById(actorId).select("-otp -otpExpires");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked. Please contact support.",
      });
    }

    req.user = user;
    req.actor = { id: user._id, role: "user" };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
