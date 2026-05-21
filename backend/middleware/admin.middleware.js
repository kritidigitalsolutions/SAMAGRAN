// middleware/admin.middleware.js
import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import Vendor from "../models/vendor.model.js";

export const protectAdmin = async (req, res, next) => {
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

    // 3. Check admin flag
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Access denied (Admin only)" });
    }

    // 4. Attach admin to request
    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    req.admin = admin;

    if (admin.role === "vendor") {
      if (!admin.vendorId) {
        return res.status(403).json({ message: "Vendor account not linked" });
      }

      const vendor = await Vendor.findById(admin.vendorId).lean();
      if (!vendor) {
        return res.status(403).json({ message: "Vendor not found" });
      }

      if (vendor.status !== "active") {
        return res.status(403).json({ message: "Vendor not approved" });
      }

      req.vendor = vendor;
    }

    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== "super") {
    return res.status(403).json({ message: "Super admin access required" });
  }

  return next();
};