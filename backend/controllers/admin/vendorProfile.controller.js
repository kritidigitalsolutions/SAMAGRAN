import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Admin from "../../models/admin.model.js";
import Vendor from "../../models/vendor.model.js";

const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

const buildAddressPayload = (input = {}) => {
  const pincodeStr = String(input?.pincode || "").trim();
  const pincodesArr = pincodeStr
    ? pincodeStr.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  return {
    line1: String(input?.line1 || "").trim(),
    line2: String(input?.line2 || "").trim(),
    city: String(input?.city || "").trim(),
    state: String(input?.state || "").trim(),
    pincode: pincodeStr,
    pincodes: pincodesArr,
  };
};

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

    if (payload.kyc !== undefined) {
      updates.kyc = {
        pan: String(payload.kyc?.pan !== undefined ? payload.kyc.pan : (vendor.kyc?.pan || "")).trim(),
        panVerified: vendor.kyc?.panVerified || false,
        aadhaar: String(payload.kyc?.aadhaar !== undefined ? payload.kyc.aadhaar : (vendor.kyc?.aadhaar || "")).trim(),
        aadhaarVerified: vendor.kyc?.aadhaarVerified || false,
        gst: String(payload.kyc?.gst !== undefined ? payload.kyc.gst : (vendor.kyc?.gst || "")).trim(),
        fssai: String(payload.kyc?.fssai !== undefined ? payload.kyc.fssai : (vendor.kyc?.fssai || "")).trim(),
        cin: String(payload.kyc?.cin !== undefined ? payload.kyc.cin : (vendor.kyc?.cin || "")).trim(),
      };
    }

    if (payload.bank !== undefined) {
      updates.bank = {
        accountHolder: String(payload.bank?.accountHolder !== undefined ? payload.bank.accountHolder : (vendor.bank?.accountHolder || "")).trim(),
        bankName: String(payload.bank?.bankName !== undefined ? payload.bank.bankName : (vendor.bank?.bankName || "")).trim(),
        accountNumber: String(payload.bank?.accountNumber !== undefined ? payload.bank.accountNumber : (vendor.bank?.accountNumber || "")).trim(),
        ifsc: String(payload.bank?.ifsc !== undefined ? payload.bank.ifsc : (vendor.bank?.ifsc || "")).trim(),
        upiId: String(payload.bank?.upiId !== undefined ? payload.bank.upiId : (vendor.bank?.upiId || "")).trim(),
        bankVerified: vendor.bank?.bankVerified || false,
      };
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
