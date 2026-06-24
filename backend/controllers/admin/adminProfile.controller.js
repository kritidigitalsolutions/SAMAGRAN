import bcrypt from "bcryptjs";
import Admin from "../../models/admin.model.js";
import Vendor from "../../models/vendor.model.js";

// GET /api/admin/profile
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-password").lean();
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    return res.json({ success: true, data: { admin } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/admin/profile
export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body || {};
    const adminId = req.admin._id;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();

    if (updates.email) {
      const emailExists = await Admin.findOne({ email: updates.email, _id: { $ne: adminId } }).lean();
      if (emailExists) {
        return res.status(409).json({ success: false, message: "Email already in use by another admin" });
      }
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updates },
      { new: true }
    ).select("-password").lean();

    // Keep Vendor email/name in sync if the admin role is vendor
    if (updatedAdmin.role === "vendor" && updatedAdmin.vendorId) {
      await Vendor.findByIdAndUpdate(updatedAdmin.vendorId, {
        $set: {
          name: updatedAdmin.name,
          email: updatedAdmin.email
        }
      });
    }

    return res.json({ success: true, data: { admin: updatedAdmin } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/admin/password
export const updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword = "", newPassword = "" } = req.body || {};

    if (!String(newPassword).trim() || String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(String(currentPassword), admin.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }
    }

    admin.password = await bcrypt.hash(String(newPassword), 10);
    await admin.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
