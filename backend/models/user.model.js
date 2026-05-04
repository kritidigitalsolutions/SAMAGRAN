import mongoose from "mongoose";

const savedAddressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      required: true,
    },
    fullAddress: {
      type: String,
      trim: true,
      required: true,
    },
    addressType: {
      type: String,
      trim: true,
      default: "others",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true }
);

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

    savedAddresses: [savedAddressSchema],

    profileImage: {
      type: String,
      trim: true,
    },

    fcmToken: {
      type: String,
      trim: true,
      default: "",
    },

    fcmTokenUpdatedAt: {
      type: Date,
      default: null,
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deleteReason: {
      type: String,
      trim: true,
      default: "",
    },

    deleteReasonNotes: {
      type: String,
      trim: true,
      default: "",
    },

    // 🔐 OTP fields (core of your auth)
    otp: String,
    otpExpires: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);