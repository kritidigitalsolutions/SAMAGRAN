import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import OTP from "../models/otp.model.js";
import { notifyAdmins, updateDeviceToken } from "../utils/notification.service.js";

// 📌 Helper: Phone validation
const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};



export const signup = async (req, res) => {
  try {
    let { phone, name, email, address } = req.body;
const profileImage = req.file
  ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
  : req.body.profileImage || null;

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

    await OTP.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        // expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        name,
        email,
        address,
        profileImage,
        type: "signup",
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      isNewUser: true,
      message: "OTP sent for signup",
      data: { OTP: otp },
    });
    console.log("The OTP is:", OTP)
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
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
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      isNewUser:false,
      message: "OTP sent for login",
      data: { OTP: otp },
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

    let user = await User.findOne({ phone });
    let isNewUser = false;
    let isFcmTokenUpdated = false;

    // Signup flow
    if (!user && otpDoc.type === "signup") {
      user = await User.create({
        phone: otpDoc.phone,
        name: otpDoc.name,
        email: otpDoc.email,
        address: otpDoc.address,
        profileImage: otpDoc.profileImage,
        isProfileComplete: true,
      });

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

    await OTP.deleteOne({ phone });

    const token = generateToken(user._id);

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
      { upsert: true, new: true }
    );

    console.log("RESEND OTP:", otp);

    res.json({
      success: true,
      message: "OTP resent",
      data: { OTP: otp },
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