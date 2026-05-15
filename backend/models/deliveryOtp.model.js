import mongoose from "mongoose";

const deliveryOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    type: {
      type: String,
      enum: ["login"],
      default: "login",
    },
  },
  { timestamps: true }
);

export default mongoose.model("DeliveryOTP", deliveryOtpSchema);
