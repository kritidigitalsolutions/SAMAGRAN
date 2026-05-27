import mongoose from "mongoose";

const bookingPricingSchema = new mongoose.Schema(
  {
    price: {
      type: Number, // better than String
      required: true,
    },
    panditCommissionPercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    panditCommissionThreshold: {
      type: Number,
      default: 500,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BookingPricing", bookingPricingSchema);