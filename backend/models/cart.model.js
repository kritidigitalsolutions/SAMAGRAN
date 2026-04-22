import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productType: {
      type: String,
      // enum: ["Item", "FestivalKit", "DefaultKit", "UserKit"],
      // required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "productType",
      // required: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    priceAtAdd: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

cartSchema.index(
  { user: 1, product: 1, productType: 1 },
  { unique: true }
);

export default mongoose.model("Cart", cartSchema);