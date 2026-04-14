import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: ["Item", "FestivalKit"],
    required: true,
  },

  product: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "items.productType",
    required: true,
  },

  quantity: Number,
  price: Number,
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [orderItemSchema],

    totalAmount: Number,

    address: {
      name: String,
      phone: String,
      fullAddress: String,
      city: String,
      state: String,
      pincode: String,
    },

    paymentMethod: {
      type: String,
      default: "COD",
    },

    paymentStatus: {
      type: String,
      default: "Pending",
    },

    orderStatus: {
      type: String,
      default: "Placed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);