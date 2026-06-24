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
    // Human-readable vendor code e.g. VND-001
    vendorCode: { type: String, trim: true, default: "" },
    // KYC details
    kyc: {
      pan: { type: String, trim: true, default: "" },
      panVerified: { type: Boolean, default: false },
      aadhaar: { type: String, trim: true, default: "" },
      aadhaarVerified: { type: Boolean, default: false },
      gst: { type: String, trim: true, default: "" },
      fssai: { type: String, trim: true, default: "" },
      cin: { type: String, trim: true, default: "" },
    },
    // Bank account details
    bank: {
      accountHolder: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
      accountNumber: { type: String, trim: true, default: "" },
      ifsc: { type: String, trim: true, default: "" },
      upiId: { type: String, trim: true, default: "" },
      bankVerified: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Auto-generate vendorCode before save if not set
vendorSchema.pre("save", async function () {
  if (!this.vendorCode) {
    const count = await mongoose.model("Vendor").countDocuments();
    this.vendorCode = `VND-${String(count + 1).padStart(3, "0")}`;
  }
});

export default mongoose.model("Vendor", vendorSchema);
