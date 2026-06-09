import bcrypt from "bcryptjs";
import Vendor from "../../models/vendor.model.js";
import Admin from "../../models/admin.model.js";
import generateToken from "../../utils/generateToken.js";

export const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    // Check admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Vendor not found" });
    }

    if (admin.role !== "vendor") {
      return res.status(403).json({ success: false, message: "Access denied: Not a vendor" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    if (!admin.vendorId) {
      return res.status(403).json({ success: false, message: "Vendor account not linked" });
    }

    const vendor = await Vendor.findById(admin.vendorId).lean();
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor not found" });
    }

    if (vendor.status !== "active") {
      return res.status(403).json({ success: false, message: "Vendor account not active/approved" });
    }

    // Generate token (with admin flag + role)
    const token = generateToken(admin._id, true, {
      role: admin.role || "vendor",
      vendorId: String(admin.vendorId),
      pageAccess: vendor.pageAccess || [],
      isVendor: true,
    });

    res.json({
      success: true,
      message: "Vendor login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role || "vendor",
        vendorId: admin.vendorId,
        vendor: {
          id: vendor._id,
          name: vendor.name,
          businessName: vendor.businessName,
          status: vendor.status,
          pageAccess: vendor.pageAccess || [],
        },
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Login failed" });
  }
};

