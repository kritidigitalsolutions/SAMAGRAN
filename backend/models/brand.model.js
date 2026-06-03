import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    subBrand: { type: String, trim: true, default: "" },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Brand", brandSchema);
