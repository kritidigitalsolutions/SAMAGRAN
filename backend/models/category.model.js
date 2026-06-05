import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
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
    subCategory: { type: String, trim: true, default: "" },
    superAdminCommissionPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
