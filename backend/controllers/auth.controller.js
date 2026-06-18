import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import OTP from "../models/otp.model.js";
import Coupon from "../models/coupon.model.js";
import { notifyAdmins, updateDeviceToken } from "../utils/notification.service.js";
import { sendOtpSms } from "../utils/sms.service.js";
import { uploadFileToFirebase } from "../utils/firebaseUpload.js";
import { isFirebaseReady } from "../config/firebase.js";

// 📌 Helper: Phone validation
const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const WELCOME_COUPON_PERCENT = 10;
const WELCOME_COUPON_MAX = 100;

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

    phone = phone.replace(/\s+/g, "").trim();

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        isNewUser: false,
        message: "User already exists. Please login.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

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
    const smsSent = await sendOtpSms(phone, otp, "user");
    
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

    phone = phone.trim();

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({
        success: false,
        isNewUser: true,
        message: "User not found. Please signup.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

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

    // 📱 Send OTP via SMS Gateway
    const smsSent = await sendOtpSms(phone, otp, "user");
    
    res.json({
      success: true,
      isNewUser:false,
      message: "OTP sent for login",
      data: { 
        OTP: otp,
        smsSent: smsSent.success,
        smsStatus: smsSent.success ? "delivered" : "failed"
      },
    });
    console.log(`The Login OTP is :`, otp)
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= VERIFY OTP =================
// export const verifyOtp = async (req, res) => {
//   try {
//     let { phone, otp } = req.body;

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

//     if (!user.otp || user.otp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     if (user.otpExpires < new Date()) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired",
//       });
//     }

//     user.isProfileComplete = true;

//     // 🔐 Clear sensitive data
//     user.otp = null;
//     user.otpExpires = null;

//     await user.save();

//     const token = generateToken(user._id);

//     return res.json({
//       success: true,
//       message: "Login successful",
//       data: {
//         token,
//         user: {
//           _id: user._id,
//           phone: user.phone,
//           name: user.name,
//           email: user.email,
//           address: user.address,
//           profileImage: user.profileImage,
//         },
//       },
//     });

//   } catch (err) {
//     console.error("VERIFY OTP ERROR:", err);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };
export const verifyOtp = async (req, res) => {
  try {
    let { phone, otp, fcmToken, firebaseToken, deviceToken } = req.body || {};
    const incomingFcmToken = String(
      fcmToken || firebaseToken || deviceToken || ""
    ).trim();

    phone = phone.trim();

    const otpDoc = await OTP.findOne({ phone });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (otpDoc.otp !== otp) {
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

    phone = phone.trim();

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

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

    // 📱 Send OTP via SMS Gateway
    const smsSent = await sendOtpSms(phone, otp, "user");

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

    const user = await updateDeviceToken({
      Model: User,
      id: req.user._id,
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
      message: "FCM token updated",
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