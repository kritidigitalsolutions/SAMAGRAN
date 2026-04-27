import mongoose from "mongoose";

const bookingPricingSchema = new mongoose.Schema(
  {
    price: {
      type: Number, // better than String
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BookingPricing", bookingPricingSchema);