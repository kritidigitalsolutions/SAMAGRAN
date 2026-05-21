import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Admin from "../../models/admin.model.js";
import Vendor from "../../models/vendor.model.js";

const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

const buildAddressPayload = (input = {}) => ({
  line1: String(input?.line1 || "").trim(),
  line2: String(input?.line2 || "").trim(),
  city: String(input?.city || "").trim(),
  state: String(input?.state || "").trim(),
  pincode: String(input?.pincode || "").trim(),
});

const ensureVendor = async (req, res) => {
  if (req.admin?.role !== "vendor") {
    res.status(403).json({ success: false, message: "Vendor access required" });
    return null;
  }

  if (req.vendor?._id) {
    return req.vendor;
  }

  const vendorId = req.admin?.vendorId;
  if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
    res.status(403).json({ success: false, message: "Vendor access required" });
    return null;
  }

  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) {
    res.status(403).json({ success: false, message: "Vendor access required" });
    return null;
  }

  return vendor;
};

export const getVendorProfile = async (req, res) => {
  const vendor = await ensureVendor(req, res);
  if (!vendor) return;

  return res.json({
    success: true,
    data: {
      admin: {
        id: req.admin?._id,
        name: req.admin?.name || "",
        email: req.admin?.email || "",
      },
      vendor,
    },
  });
};

export const updateVendorProfile = async (req, res) => {
  try {
    const vendor = await ensureVendor(req, res);
    if (!vendor) return;

    const payload = req.body || {};
    const updates = {};

    if (payload.name !== undefined) {
      updates.name = String(payload.name || "").trim();
    }

    if (payload.businessName !== undefined) {
      updates.businessName = String(payload.businessName || "").trim();
    }

    if (payload.email !== undefined) {
      updates.email = String(payload.email || "").trim().toLowerCase();
    }

    if (payload.phone !== undefined) {
      updates.phone = String(payload.phone || "").trim();
    }

    if (payload.address !== undefined) {
      updates.address = buildAddressPayload(payload.address);
    }

    if (updates.phone && !isValidPhone(updates.phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    if (updates.email) {
      const emailExists = await Vendor.findOne({ email: updates.email, _id: { $ne: vendor._id } }).lean();
      if (emailExists) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }

      const adminEmailExists = await Admin.findOne({ email: updates.email, _id: { $ne: req.admin?._id } }).lean();
      if (adminEmailExists) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
    }

    if (updates.phone) {
      const phoneExists = await Vendor.findOne({ phone: updates.phone, _id: { $ne: vendor._id } }).lean();
      if (phoneExists) {
        return res.status(409).json({ success: false, message: "Phone already in use" });
      }
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendor._id,
      { $set: updates },
      { new: true }
    ).lean();

    const adminUpdates = {};
    if (updates.name !== undefined) adminUpdates.name = updates.name;
    if (updates.email !== undefined) adminUpdates.email = updates.email;

    let updatedAdmin = req.admin;
    if (Object.keys(adminUpdates).length) {
      updatedAdmin = await Admin.findByIdAndUpdate(
        req.admin._id,
        { $set: adminUpdates },
        { new: true }
      ).lean();
    }

    return res.json({
      success: true,
      data: {
        admin: updatedAdmin,
        vendor: updatedVendor,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to update profile" });
  }
};

export const updateVendorPassword = async (req, res) => {
  try {
    const vendor = await ensureVendor(req, res);
    if (!vendor) return;

    const { currentPassword = "", newPassword = "" } = req.body || {};

    if (!String(newPassword || "").trim() || String(newPassword).length < 6) {
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

    return res.json({ success: true, message: "Password updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to update password" });
  }
};
