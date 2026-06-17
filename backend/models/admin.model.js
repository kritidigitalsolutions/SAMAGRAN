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
    companyName: { type: String, default: "Samagran Ventures Private Limited" },
    address: { type: String, default: "godown, Patlipada, Hiranandani, Thane (W)-400607, MH, India" },
    cin: { type: String, default: "U74140MH2025PTC055568" },
    pan: { type: String, default: "AAFCS8024E" },
    fssai: { type: String, default: "10018064001545" },
    email: { type: String, default: "support@samagran.com" },
    phone: { type: String, default: "+91-9988776655" },
    authorizedSignatory: { type: String, default: "Anil Sharma" },
  },
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);