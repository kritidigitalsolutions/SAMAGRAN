import mongoose from "mongoose";

const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    ifscCode: { type: String, trim: true, default: "" },
    bankName: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const panditPayoutSchema = new mongoose.Schema(
  {
    pandit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pandit",
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["paid"],
      default: "paid",
    },
    method: {
      type: String,
      enum: ["bank", "upi", "cash", "other"],
      default: "bank",
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },
    upiId: {
      type: String,
      trim: true,
      default: "",
    },
    reference: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PanditPayout", panditPayoutSchema);
