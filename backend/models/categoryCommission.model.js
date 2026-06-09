import mongoose from "mongoose";

const categoryCommissionSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
      default: "All",
    },
    commissionType: {
      type: String,
      enum: ["Percentage (%)", "Flat Amount (₹)"],
      default: "Percentage (%)",
    },
    base: {
      type: String,
      default: "Profit (Selling - Purchase)",
    },
    partnerSharePercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    partnerShareFlat: {
      type: Number,
      default: 0,
      min: 0,
    },
    superAdminSharePercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    superAdminShareFlat: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Unique constraint on categoryId + subCategory
categoryCommissionSchema.index({ categoryId: 1, subCategory: 1 }, { unique: true });

export default mongoose.model("CategoryCommission", categoryCommissionSchema);
