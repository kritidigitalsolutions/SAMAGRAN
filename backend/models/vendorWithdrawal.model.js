import mongoose from "mongoose";

const bankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    ifsc: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const vendorWithdrawalSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["bank", "upi"],
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
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    expectedArrival: {
      type: String,
      trim: true,
      default: "",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

import { attachSseMiddleware } from "../utils/sse.js";
attachSseMiddleware(vendorWithdrawalSchema, "transactions_update");

export default mongoose.model("VendorWithdrawal", vendorWithdrawalSchema);
