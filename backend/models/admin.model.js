// models/admin.model.js
import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name:{type: String,required:true},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["super", "vendor"],
    default: "super",
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    default: null,
  },
  fcmToken: { type: String, trim: true, default: "" },
  fcmTokenUpdatedAt: { type: Date, default: null },
  resetOtpHash: { type: String, default: "" },
  resetOtpExpiresAt: { type: Date, default: null },
  corporateDetails: {
    companyName: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    address: { type: String, default: "" },
    cin: { type: String, default: "" },
    pan: { type: String, default: "" },
    fssai: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    authorizedSignatory: { type: String, default: "" },
  },
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);