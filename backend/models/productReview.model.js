import mongoose from "mongoose";

const productReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

productReviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model("ProductReview", productReviewSchema);
