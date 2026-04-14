import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true, // ✅ important
    },

    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      trim: true,
    },

    profileImage: {
      type: String,
      trim: true,
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    // 🔐 OTP fields (core of your auth)
    otp: String,
    otpExpires: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);