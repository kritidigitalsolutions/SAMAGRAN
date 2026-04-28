import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subTitle: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    priceOff: {
      type: String,
    },
    status: {
      type: String,
      // enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

BannerSchema.index({ title: 1 }, { unique: true });

export default mongoose.model("BAnner", BannerSchema);
