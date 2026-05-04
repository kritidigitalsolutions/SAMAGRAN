// controllers/admin.controller.js
import Admin from "../../models/admin.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";
import { updateDeviceToken } from "../../utils/notification.service.js";

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

    // 4. Generate token (with admin flag)
    const token = generateToken(admin._id, true);

    // 5. Response
    res.json({
      message: "Admin login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
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
