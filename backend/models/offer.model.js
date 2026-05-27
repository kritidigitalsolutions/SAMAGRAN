import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    offerType: {
      type: String,
      enum: ["discount", "cashback"],
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "flat"],
      default: "flat",
    },
    value: {
      type: Number,
      required: true,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxBenefit: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Offer", offerSchema);
