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

// Auto-generate unique code if not provided
categorySchema.pre("save", async function generateCategoryCode() {
  if (this.code && this.code.trim()) {
    return;
  }

  let candidate = "";
  let exists = true;

  while (exists) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    candidate = `CAT${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    exists = await this.constructor.exists({ code: candidate });
  }

  this.code = candidate;
});

export default mongoose.model("Category", categorySchema);
