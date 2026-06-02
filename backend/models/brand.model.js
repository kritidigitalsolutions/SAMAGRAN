import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    parentBrand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Brand", brandSchema);
