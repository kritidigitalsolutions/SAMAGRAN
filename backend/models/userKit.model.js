import mongoose from "mongoose";

const userKitItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },

  quantity: {
    type: Number,
    default: 1,
  },

  priceAtTime: {
    type: Number,
    default: 0,
  }
});

const userKitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      trim: true,
    },

    baseKit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FestivalKit",
      default: null,
    },

    items: [userKitItemSchema],

    totalPrice: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["draft", "ordered"],
      default: "draft",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserKit", userKitSchema);