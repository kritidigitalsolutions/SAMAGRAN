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
        default: 0
      },

      codCharge: {
        type: Number,
        default: 0
      },

      status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
      }
    },
    {
      timestamps: true
    }
  );

vendorDeliveryPricingSchema.index({ vendorId: 1, locationName: 1, pincode: 1 });

const VendorDeliveryPricing = mongoose.model(
  "VendorDeliveryPricing",
  vendorDeliveryPricingSchema
);

VendorDeliveryPricing.collection.dropIndex("vendorId_1_locationName_1").catch(() => {});

export default VendorDeliveryPricing;