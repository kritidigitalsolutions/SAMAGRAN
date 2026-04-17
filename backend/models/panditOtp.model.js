import mongoose from "mongoose";

const panditOtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["signup", "login"],
      required: true,
    },
    fullName: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },

  },
  { timestamps: true }
);

export default mongoose.model("PanditOTP", panditOtpSchema);
