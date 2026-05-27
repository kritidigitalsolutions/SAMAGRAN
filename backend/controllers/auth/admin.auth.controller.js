// controllers/admin.controller.js
import crypto from "crypto";
import Admin from "../../models/admin.model.js";
import Vendor from "../../models/vendor.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";
import { updateDeviceToken } from "../../utils/notification.service.js";
import { sendAdminOtpEmail } from "../../utils/email.service.js";

const buildOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const isOtpValid = (admin, otp) => {
  if (!admin?.resetOtpHash || !admin?.resetOtpExpiresAt) {
    return false;
  }
  if (new Date(admin.resetOtpExpiresAt).getTime() < Date.now()) {
    return false;
  }
  return admin.resetOtpHash === hashOtp(otp);
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 2. Check admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    let vendor = null;

    if (admin.role === "vendor") {
      if (!admin.vendorId) {
        return res.status(403).json({ message: "Vendor account not linked" });
      }

      vendor = await Vendor.findById(admin.vendorId).lean();
      if (!vendor) {
        return res.status(403).json({ message: "Vendor not found" });
      }

      if (vendor.status !== "active") {
        return res.status(403).json({ message: "Vendor not approved" });
      }
    }

    // 4. Generate token (with admin flag + role)
    const token = generateToken(admin._id, true, {
      role: admin.role || "super",
      vendorId: admin.vendorId ? String(admin.vendorId) : null,
      pageAccess: vendor?.pageAccess || [],
      isVendor: admin.role === "vendor",
    });

    // 5. Response
    res.json({
      message: "Admin login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role || "super",
        vendorId: admin.vendorId || null,
        vendor: vendor
          ? {
              id: vendor._id,
              name: vendor.name,
              businessName: vendor.businessName,
              status: vendor.status,
              pageAccess: vendor.pageAccess || [],
            }
          : null,
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdminFcmToken = async (req, res) => {
  try {
    const { fcmToken = "" } = req.body || {};
    const token = String(fcmToken || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "fcmToken is required",
      });
    }

    const admin = await updateDeviceToken({
      Model: Admin,
      id: req.admin._id,
      token,
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.json({
      success: true,
      message: "FCM token updated",
      data: {
        adminId: admin._id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update FCM token",
    });
  }
};

export const updateVendorFcmToken = async (req, res) => {
  try {
    const { fcmToken = "" } = req.body || {};
    const token = String(fcmToken || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "fcmToken is required",
      });
    }

    // Only vendors should be able to update their FCM token
    if (req.admin?.role !== "vendor" || !req.admin?.vendorId) {
      return res.status(403).json({
        success: false,
        message: "Only vendors can update vendor FCM token",
      });
    }

    const vendor = await updateDeviceToken({
      Model: Vendor,
      id: req.admin.vendorId,
      token,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.json({
      success: true,
      message: "Vendor FCM token updated",
      data: {
        vendorId: vendor._id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update FCM token",
    });
  }
};

export const requestAdminPasswordReset = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const admin = await Admin.findOne({ email: String(email).trim() });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const otp = buildOtp();
    admin.resetOtpHash = hashOtp(otp);
    admin.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    await sendAdminOtpEmail(admin.email, otp, "password_reset", admin.name || "Admin");

    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to send OTP" });
  }
};

export const resetAdminPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP and newPassword are required" });
    }

    const admin = await Admin.findOne({ email: String(email).trim() });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (!isOtpValid(admin, String(otp).trim())) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    admin.password = hashedPassword;
    admin.resetOtpHash = "";
    admin.resetOtpExpiresAt = null;
    await admin.save();

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to reset password" });
  }
};
