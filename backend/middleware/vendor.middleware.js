// middleware/vendor.middleware.js
import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import Vendor from "../models/vendor.model.js";

export const protectVendor = async (req, res, next) => {
  try {
    let token;

    // 1. Extract token
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check vendor role
    if (!decoded.isAdmin || decoded.role !== "vendor") {
      return res.status(403).json({ message: "Access denied (Vendor only)" });
    }

    // 4. Fetch admin with vendor role
    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    if (admin.role !== "vendor") {
      return res.status(403).json({ message: "Only vendors can access this endpoint" });
    }

    if (!admin.vendorId) {
      return res.status(403).json({ message: "Vendor account not linked" });
    }

    // 5. Fetch vendor details
    const vendor = await Vendor.findById(admin.vendorId).lean();

    if (!vendor) {
      return res.status(403).json({ message: "Vendor not found" });
    }

    if (vendor.status !== "active") {
      return res.status(403).json({
        message: "Vendor not approved. Please contact admin.",
        status: vendor.status,
      });
    }

    // 6. Attach to request
    req.admin = admin;
    req.vendor = vendor;
    req.vendorId = vendor._id;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(500).json({ message: error.message || "Authentication failed" });
  }
};
