import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: ["Item", "FestivalKit", "DefaultKit", "UserKit"],
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

    amountBreakup: {
      itemTotal: {
        type: Number,
        default: 0,
      },
      deliveryFee: {
        type: Number,
        default: 0,
      },
    },

    addressType: {
      type: String,
      default: "others",
    },
    address: {
      name: String,
      phone: String,
      fullAddress: String,
      addressType: {
        type: String,
        default: "others",
      },
      city: String,
      state: String,
      pincode: String,
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    paymentGateway: {
      type: String,
      default: null,
    },

    razorpayOrderId: {
      type: String,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },

    orderStatus: {
      type: String,
      default: "Placed",
    },
    cancellationRequests: {
      type: [
        {
          reason: { type: String, trim: true, default: "" },
          notes: { type: String, trim: true, default: "" },
          requestedBy: { type: String, trim: true, default: "user" },
          requestedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    rescheduleRequests: {
      type: [
        {
          reason: { type: String, trim: true, default: "" },
          notes: { type: String, trim: true, default: "" },
          requestedBy: { type: String, trim: true, default: "user" },
          requestedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);