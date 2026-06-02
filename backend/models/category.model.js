import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    subCategory: { type: String, trim: true, default: "" },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
