import mongoose from "mongoose";

const deliveryBoySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    aadhar: {
      type: String,
      trim: true,
      default: "",
    },
    pan: {
      type: String,
      trim: true,
      default: "",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DeliveryBoy", deliveryBoySchema);
