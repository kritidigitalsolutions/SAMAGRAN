import jwt from "jsonwebtoken";
import DeliveryBoy from "../../models/deliveryBoy.model.js";
import DeliveryOTP from "../../models/deliveryOtp.model.js";
import { sendOtpSms } from "../../utils/sms.service.js";

const buildOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

const generateDeliveryToken = (deliveryBoyId) =>
  jwt.sign(
    {
      id: deliveryBoyId,
      role: "delivery",
      isAdmin: false,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    }
  );

export const requestDeliveryOtp = async (req, res) => {
  try {
    const phone = String(req.body?.phone || "").trim();

    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const deliveryBoy = await DeliveryBoy.findOne({ phone });
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }

    if (deliveryBoy.status !== "active") {
      return res.status(403).json({ success: false, message: "Delivery boy is inactive" });
    }

    const otp = buildOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await DeliveryOTP.findOneAndUpdate(
      { phone },
      { otp, expiresAt, type: "login" },
      { upsert: true, new: true }
    );

    console.log(`Delivery OTP for ${phone}: ${otp}`);

    const smsResult = await sendOtpSms(phone, otp, "delivery");
    if (!smsResult?.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to send OTP. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: "OTP sent for delivery login",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to send OTP" });
  }
};

export const verifyDeliveryOtp = async (req, res) => {
  try {
    const phone = String(req.body?.phone || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!isValidPhone(phone) || !otp) {
      return res.status(400).json({ success: false, message: "phone and otp are required" });
    }

    const otpDoc = await DeliveryOTP.findOne({ phone }).sort({ createdAt: -1 });
    if (!otpDoc) {
      return res.status(404).json({ success: false, message: "OTP not found" });
    }

    if (otpDoc.expiresAt && otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (otpDoc.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const deliveryBoy = await DeliveryBoy.findOne({ phone });
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }

    if (deliveryBoy.status !== "active") {
      return res.status(403).json({ success: false, message: "Delivery boy is inactive" });
    }

    deliveryBoy.lastLoginAt = new Date();
    await deliveryBoy.save();

    await DeliveryOTP.deleteMany({ phone });

    const token = generateDeliveryToken(deliveryBoy._id);

    return res.json({
      success: true,
      message: "Delivery login successful",
      data: {
        token,
        deliveryBoy: {
          id: deliveryBoy._id,
          fullName: deliveryBoy.fullName,
          phone: deliveryBoy.phone,
          status: deliveryBoy.status,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to verify OTP" });
  }
};

export const getDeliveryProfile = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        deliveryBoy: req.deliveryBoy,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to load profile" });
  }
};
