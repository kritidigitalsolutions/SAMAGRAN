import mongoose from "mongoose";

const vendorDeliveryPricingSchema =
  new mongoose.Schema(
    {
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
        index: true
      },

      locationName: {
        type: String,
        required: true,
        trim: true
      },

      state: {
        type: String,
        default: ""
      },

      pincode: {
        type: String,
        default: ""
      },

      deliveryCharge: {
        type: Number,
        required: true
      },

      status: {
        type: Boolean,
        default: true
      }
    },
    {
      timestamps: true
    }
  );

export default mongoose.model(
  "VendorDeliveryPricing",
  vendorDeliveryPricingSchema
);