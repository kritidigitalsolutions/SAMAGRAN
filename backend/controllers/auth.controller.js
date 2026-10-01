import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Pandit from "../models/pandit.model.js";
import generateToken from "../utils/generateToken.js";
import { deleteUserCompleteData } from "./admin/user.controller.js";
import OTP from "../models/otp.model.js";
import Coupon from "../models/coupon.model.js";
import { notifyAdmins, updateDeviceToken } from "../utils/notification.service.js";
import { sendOtpSms } from "../utils/sms.service.js";
import { uploadFileToFirebase } from "../utils/firebaseUpload.js";
import { isFirebaseReady } from "../config/firebase.js";

export const normalizePhone = (phone = "") => {
  let cleaned = String(phone || "").replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

// 📌 Helper: Phone validation (expects 10-digit phone starting with 6-9)
const validatePhone = (phone) => {
  const cleaned = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(cleaned);
};

const WELCOME_COUPON_PERCENT = 10;
const WELCOME_COUPON_MAX = 100;

export const DEMO_PHONES = new Set([
  "8888888888",
  "9999999999",
  ...(process.env.DEMO_USER_PHONE ? [process.env.DEMO_USER_PHONE] : []),
  ...(process.env.DEMO_PANDIT_PHONE ? [process.env.DEMO_PANDIT_PHONE] : []),
  ...(process.env.DEMO_PHONES ? process.env.DEMO_PHONES.split(",").map(p => p.trim()) : [])
].map(p => normalizePhone(p)).filter(Boolean));

export const DEMO_USER_OTP = process.env.DEMO_OTP || process.env.DEMO_USER_OTP || process.env.DEMO_PANDIT_OTP || "123456";

export const isDemoPhone = (phone) => {
  const normalized = normalizePhone(phone);
  return DEMO_PHONES.has(normalized);
};

export const ensureDemoUserExists = async (phone = "8888888888") => {
  const cleanPhone = normalizePhone(phone);
  let existingUser = await User.findOne({ phone: cleanPhone });
  if (existingUser) {
    let changed = false;
    if (existingUser.isDeleted) {
      existingUser.isDeleted = false;
      existingUser.deletedAt = null;
      existingUser.deleteReason = "";
      existingUser.deleteReasonNotes = "";
      changed = true;
    }
    if (existingUser.isBlocked) {
      existingUser.isBlocked = false;
      changed = true;
    }
    if (!existingUser.isProfileComplete) {
      existingUser.isProfileComplete = true;
      changed = true;
    }
    if (changed) {
      await existingUser.save();
    }
    return existingUser;
  }

  return User.create({
    phone: cleanPhone,
    name: "Demo User",
    email: `demo.${cleanPhone}@samagran.local`,
    address: "Demo User Address",
    isProfileComplete: true,
    isBlocked: false,
    isDeleted: false,
  });
};
// 🎁 Super admin ke globally created welcome coupon ko user ko assign karta hai
// Per-user unique coupon banana band kiya — ab ek global welcome coupon hoga jo admin control karta hai
const createWelcomeCouponForUser = async (user) => {
  if (!user || user.welcomeCouponCode || user.welcomeCouponRedeemed) {
    return null;
  }

  // DB se active global welcome coupon dhundo
  const welcomeCoupon = await Coupon.findOne({
    isWelcomeCoupon: true,
    isActive: true,
  });

  if (!welcomeCoupon) {
    // Koi active welcome coupon nahi hai — assign mat karo
    return null;
  }

  // Welcome coupon ka code user ko assign karo
  user.welcomeCouponCode = welcomeCoupon.code;
  user.welcomeCouponRedeemed = false;
  user.welcomeCouponAssignedAt = new Date();
  await user.save();

  return welcomeCoupon;
};


export const signup = async (req, res) => {
  try {
    console.log("🚀 SIGNUP REQUEST STARTED");
    console.log("  Firebase Ready:", isFirebaseReady ? "✅ YES" : "⚠️ NO");
    console.log("  Has file:", !!req.file ? "✅ YES" : "❌ NO");
    
    let { phone, name, email, address } = req.body;
    
    let profileImage = null;
    if (req.file) {
      try {
        console.log("📸 File received from request:", {
          filename: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype,
          size: req.file.size,
          destination: req.file.destination,
          filename_saved: req.file.filename,
          path: req.file.path,
          hasBuffer: !!req.file.buffer,
          hasPath: !!req.file.path,
          fieldname: req.file.fieldname,
        });
        
        console.log("📸 Uploading profile image to Firebase...", {
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          hasBuffer: !!req.file.buffer,
          hasPath: !!req.file.path,
        });
        profileImage = await uploadFileToFirebase(req.file, { folder: "users/profile" });
        console.log("✅ Profile image upload result:", {
          success: !!profileImage,
          profileImage: profileImage ? profileImage.substring(0, 80) + "..." : "NULL/EMPTY",
          type: typeof profileImage,
          length: profileImage?.length || 0,
        });
        
        if (!profileImage || profileImage === "") {
          console.warn("⚠️  WARNING: uploadFileToFirebase returned empty/null value");
        }
      } catch (uploadError) {
        console.error("❌ Profile image upload ERROR:", {
          error: uploadError.message,
          stack: uploadError.stack,
        });
        // Continue with signup even if image upload fails
      }
    } else if (req.body.profileImage) {
      profileImage = req.body.profileImage;
      console.log("📸 Using provided profileImage URL:", profileImage);
    } else {
      console.log("⚠️  No profile image file provided in req.file");
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    phone = normalizePhone(phone);

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }
    let existingUser = await User.findOne({ phone });

    if (existingUser) {
      if (existingUser.isDeleted) {
        // If an old soft-deleted user existed before, purge it so fresh signup can proceed
        await deleteUserCompleteData(existingUser._id);
        existingUser = null;
      } else if (existingUser.isBlocked) {
        return res.status(403).json({
          success: false,
          isBlocked: true,
          message: "You are blocked. Please use a different number.",
        });
      } else {
        return res.status(400).json({
          success: false,
          isNewUser: false,
          message: "User already exists. Please login.",
        });
      }
    }

    const otp = isDemoPhone(phone) ? DEMO_USER_OTP : Math.floor(100000 + Math.random() * 900000).toString();

    console.log("💾 SAVING TO OTP:", {
      phone,
      name,
      email,
      address,
      profileImage: profileImage ? profileImage.substring(0, 80) + "..." : "NULL/EMPTY ⚠️",
    });

    const otpSaveResult = await OTP.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        // expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        name,
        email,
        address,
        profileImage, // This should be a Firebase URL or null
        type: "signup",
      },
      { upsert: true, returnDocument: "after" }
    );

    console.log("✅ OTP SAVED TO DB:", {
      phone: otpSaveResult.phone,
      hasProfileImage: !!otpSaveResult.profileImage,
      profileImage: otpSaveResult.profileImage ? otpSaveResult.profileImage.substring(0, 80) + "..." : "NULL ⚠️",
    });

    // 📱 Send OTP via SMS Gateway
    const smsSent = isDemoPhone(phone)
      ? { success: true }
      : await sendOtpSms(phone, otp, "user");
    
    res.json({
      success: true,
      isNewUser: true,
      message: "OTP sent for signup",
      data: { 
        OTP: otp,
        smsSent: smsSent.success,
        smsStatus: smsSent.success ? "delivered" : "failed"
      },
    });
    console.log("The OTP is:", otp)
  } catch (err) {
    console.error("❌ SIGNUP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    phone = normalizePhone(phone);

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }
    if (isDemoPhone(phone)) {
      await ensureDemoUserExists(phone);
    }

    let user = await User.findOne({ phone });

    // If user was previously soft-deleted, purge old data so they can start fresh
    if (user && user.isDeleted) {
      await deleteUserCompleteData(user._id);
      user = null;
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        isNewUser: true,
        message: "User not found. Please signup.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: "You are blocked. Please use a different number.",
      });
    }

    const otp = isDemoPhone(phone) ? DEMO_USER_OTP : Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        // expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        type: "login",
      },
      { upsert: true, returnDocument: "after" }
    );

    const smsSent = isDemoPhone(phone)
      ? { success: true }
      : await sendOtpSms(phone, otp, "user");
    
    res.json({
      success: true,
      isNewUser: false,
      message: "OTP sent for login",
      data: { 
        OTP: otp,
        smsSent: smsSent.success,
        smsStatus: smsSent.success ? "delivered" : "failed"
      },
    });
    console.log(`The Login OTP is :`, otp);
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    let { phone, otp, password, fcmToken, firebaseToken, deviceToken } = req.body || {};
    const incomingFcmToken = String(
      fcmToken || firebaseToken || deviceToken || ""
    ).trim();
    const tokenOtp = String(otp || password || "").trim();

    if (!phone || !tokenOtp) {
      return res.status(400).json({
        success: false,
        message: "phone and otp are required",
      });
    }

    phone = normalizePhone(phone);

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (isDemoPhone(phone) && tokenOtp === DEMO_USER_OTP) {
      let user = await ensureDemoUserExists(phone);
      let isFcmTokenUpdated = false;

      if (incomingFcmToken) {
        const updatedUser = await updateDeviceToken({
          Model: User,
          id: user._id,
          token: incomingFcmToken,
        });

        if (updatedUser) {
          user = updatedUser;
          isFcmTokenUpdated = true;
        }
      }

      await OTP.deleteOne({ phone });

      return res.json({
        success: true,
        isNewUser: false,
        message: "Verified successfully",
        data: {
          token: generateToken(user._id),
          fcmTokenUpdated: isFcmTokenUpdated,
          user,
        },
      });
    }

    const otpDoc = await OTP.findOne({ phone });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (otpDoc.otp !== tokenOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
    console.log("📋 OTP verified, found OTP doc:", {
      phone: otpDoc.phone,
      hasProfileImage: !!otpDoc.profileImage,
      profileImage: otpDoc.profileImage ? otpDoc.profileImage.substring(0, 80) + "..." : "NULL ⚠️",
      type: otpDoc.type,
    });

    let user = await User.findOne({ phone });

    if (user && user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: "You are blocked. Please use a different number.",
      });
    }

    if (user && user.isDeleted) {
      await deleteUserCompleteData(user._id);
      user = null;
    }

    let isNewUser = false;
    let isFcmTokenUpdated = false;

    // Signup flow
    if (!user && otpDoc.type === "signup") {
      console.log("👤 Creating new user with data:", {
        phone: otpDoc.phone,
        name: otpDoc.name,
        profileImage: otpDoc.profileImage ? otpDoc.profileImage.substring(0, 80) + "..." : "NULL ⚠️",
      });
      
      user = await User.create({
        phone: otpDoc.phone,
        name: otpDoc.name,
        email: otpDoc.email,
        address: otpDoc.address,
        profileImage: otpDoc.profileImage, // THIS is key - should copy from OTP
        isProfileComplete: true,
      });

      console.log("✅ User created in DB:", {
        _id: user._id,
        phone: user.phone,
        hasProfileImage: !!user.profileImage,
        profileImage: user.profileImage ? user.profileImage.substring(0, 80) + "..." : "NULL ⚠️",
      });

      // 🔄 Fetch user again to ensure all fields including profileImage are populated
      user = await User.findById(user._id);
      console.log("🔄 User refreshed after create:", {
        hasProfileImage: !!user.profileImage,
        profileImage: user.profileImage ? user.profileImage.substring(0, 80) + "..." : "NULL ⚠️",
      });

      try {
        await createWelcomeCouponForUser(user);
      } catch (error) {
        console.error("WELCOME COUPON ERROR:", error.message);
      }

      void notifyAdmins({
        title: "New user account created",
        body: `${user.name || user.phone || "A user"} joined Samagran`,
        data: {
          eventType: "user.signup",
          userId: String(user._id),
          phone: user.phone,
        },
      }).catch((error) => console.error("USER SIGNUP NOTIFICATION ERROR:", error.message));

      isNewUser = true;
    }

    // Login flow
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (incomingFcmToken) {
      const updatedUser = await updateDeviceToken({
        Model: User,
        id: user._id,
        token: incomingFcmToken,
      });

      if (updatedUser) {
        user = updatedUser;
        isFcmTokenUpdated = true;
      }
    }

    // 🔄 Ensure user object has all fields including profileImage before returning
    if (!user.profileImage && user._id) {
      console.log("🔄 profileImage missing, doing extra refresh...");
      const freshUser = await User.findById(user._id);
      if (freshUser) {
        user = freshUser;
        console.log("🔄 User refreshed (extra), now has profileImage:", user.profileImage ? "✅ " + user.profileImage.substring(0, 80) + "..." : "❌ still missing");
      }
    }

    // 🔄 Final refresh to ensure all fields are in the response
    const finalUser = await User.findById(user._id);
    if (finalUser) {
      user = finalUser;
      console.log("🔄 Final user refresh complete:", {
        phone: user.phone,
        hasProfileImage: !!user.profileImage,
        profileImage: user.profileImage ? user.profileImage.substring(0, 80) + "..." : "NULL ⚠️",
      });
    }

    await OTP.deleteOne({ phone });

    const token = generateToken(user._id);

    console.log("📤 FINAL RESPONSE DATA:", {
      token: token.substring(0, 50) + "...",
      isNewUser,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        hasProfileImage: !!user.profileImage,
        profileImage: user.profileImage ? user.profileImage.substring(0, 80) + "..." : "NULL ❌❌❌",
      },
    });

    res.json({
      success: true,
      isNewUser,
      message: "Verified successfully",
      data: {
        token,
        fcmTokenUpdated: isFcmTokenUpdated,
        user,
      },
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= RESEND OTP =================
// export const resendOtp = async (req, res) => {
//   try {
//     let { phone } = req.body;

//     phone = phone.trim();

//     if (!validatePhone(phone)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid phone number",
//       });
//     }

//     const user = await User.findOne({ phone });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const otp = Math.floor(1000 + Math.random() * 9000).toString();

//     user.otp = otp;
//     user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

//     await user.save();

//     console.log("RESEND OTP:", otp);

//     return res.json({
//       success: true,
//       message: "OTP resent",
//       data: {
//         OTP: otp, // ⚠️ remove in production
//       },
//     });

//   } catch (err) {
//     console.error("RESEND OTP ERROR:", err);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };
export const resendOtp = async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }

    phone = normalizePhone(phone);

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (isDemoPhone(phone)) {
      await ensureDemoUserExists(phone);
    }

    let user = await User.findOne({ phone });

    if (user && user.isDeleted) {
      await deleteUserCompleteData(user._id);
      user = null;
    }

    if (!user) {
      const blockedUser = await User.findOne({ phone, isBlocked: true });
      if (blockedUser) {
        return res.status(403).json({
          success: false,
          isBlocked: true,
          message: "You are blocked. Please use a different number.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: "You are blocked. Please use a different number.",
      });
    }

    const otp = isDemoPhone(phone) ? DEMO_USER_OTP : Math.floor(100000 + Math.random() * 900000).toString();

    // Save to OTP collection with type="login" for resend
    await OTP.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        type: "login",
      },
      { upsert: true, returnDocument: "after" }
    );

    const smsSent = isDemoPhone(phone)
      ? { success: true }
      : await sendOtpSms(phone, otp, "user");

    console.log("RESEND OTP:", otp);

    res.json({
      success: true,
      message: "OTP resent",
      data: { 
        OTP: otp,
        smsSent: smsSent.success,
        smsStatus: smsSent.success ? "delivered" : "failed"
      },
    });

  } catch (err) {
    console.error("RESEND OTP ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateUserFcmToken = async (req, res) => {
  try {
    const { fcmToken = "" } = req.body || {};
    const token = String(fcmToken || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "fcmToken is required",
      });
    }

    if (req.pandit) {
      const pandit = await updateDeviceToken({
        Model: Pandit,
        id: req.pandit._id,
        token,
      });

      if (!pandit) {
        return res.status(404).json({
          success: false,
          message: "Pandit not found",
        });
      }

      return res.json({
        success: true,
        message: "Pandit FCM token updated",
        data: {
          panditId: pandit._id,
        },
      });
    }

    const user = await updateDeviceToken({
      Model: User,
      id: req.user?._id,
      token,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User FCM token updated",
      data: {
        userId: user._id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update FCM token",
    });
  }
};

export const checkTokenStatus = async (req, res) => {
  try {
    let token = null;

    if (req.headers.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      } else {
        token = req.headers.authorization.trim();
      }
    } else if (req.query.token) {
      token = String(req.query.token).trim();
    } else if (req.headers["x-access-token"]) {
      token = String(req.headers["x-access-token"]).trim();
    } else if (req.headers["x-auth-token"]) {
      token = String(req.headers["x-auth-token"]).trim();
    }

    if (!token) {
      return res.status(200).json({
        success: true,
        valid: false,
        expired: false,
        message: "Token is missing",
        data: null,
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp ? decoded.exp < nowInSeconds : false;

      return res.status(200).json({
        success: true,
        valid: !isExpired,
        expired: isExpired,
        message: isExpired ? "Token has expired" : "Token is valid",
        data: {
          id: decoded.id || decoded._id || decoded.userId || decoded.panditId || null,
          role: decoded.role || "user",
          isAdmin: Boolean(decoded.isAdmin),
          issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
          expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        },
      });
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(200).json({
          success: true,
          valid: false,
          expired: true,
          message: "Token has expired",
          expiredAt: jwtErr.expiredAt ? new Date(jwtErr.expiredAt).toISOString() : null,
          data: null,
        });
      }

      return res.status(200).json({
        success: true,
        valid: false,
        expired: false,
        message: jwtErr.message || "Invalid token",
        data: null,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      valid: false,
      expired: false,
      message: error.message || "Server error while checking token status",
      data: null,
    });
  }
};
