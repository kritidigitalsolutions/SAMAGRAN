import mongoose from "mongoose";

const templeAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: "" },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pinCode: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const templeSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    image: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true, default: "" },
    openingTime: { type: String, trim: true, default: "" },
    closingTime: { type: String, trim: true, default: "" },
    facilities: [{ type: String, trim: true }],
    address: {
      type: templeAddressSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("temple", templeSchema);
