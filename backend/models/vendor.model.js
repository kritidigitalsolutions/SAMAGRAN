import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    businessName: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, required: true, unique: true },
    phone: { type: String, trim: true, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "pending",
    },
    address: {
      line1: { type: String, trim: true, default: "" },
      line2: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
    },
    pageAccess: {
      type: [String],
      default: [],
    },
    notes: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    fcmToken: {
      type: String,
      trim: true,
      default: "",
    },
    fcmTokenUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Vendor", vendorSchema);
