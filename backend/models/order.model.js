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

    pandit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pandit",
      default: null,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
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
      couponDiscount: {
        type: Number,
        default: 0,
      },
      offerDiscount: {
        type: Number,
        default: 0,
      },
      walletUsed: {
        type: Number,
        default: 0,
      },
      payableAmount: {
        type: Number,
        default: 0,
      },
    },

    couponCode: {
      type: String,
      default: null,
    },

    offer: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
        default: null,
      },
      type: {
        type: String,
        default: null,
      },
    },

    discountTotal: {
      type: Number,
      default: 0,
    },

    cashbackAmount: {
      type: Number,
      default: 0,
    },

    walletUsed: {
      type: Number,
      default: 0,
    },

    payableAmount: {
      type: Number,
      default: 0,
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
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    paymentGateway: {
      type: String,
      default: null,
    },

    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      default: null,
    },
    deliveryAssignedAt: {
      type: Date,
      default: null,
    },
    deliveryAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
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
    inventoryAdjusted: {
      type: Boolean,
      default: false,
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
    invoiceDetails: {
      sellerName: { type: String, default: "" },
      sellerAddress: { type: String, default: "" },
      sellerGstin: { type: String, default: "" },
      sellerFssai: { type: String, default: "" },
      sellerCin: { type: String, default: "" },
      sellerPan: { type: String, default: "" },
      sellerEmail: { type: String, default: "" },
      sellerPhone: { type: String, default: "" },
      customerName: { type: String, default: "" },
      customerAddress: { type: String, default: "" },
      customerPhone: { type: String, default: "" },
      customerEmail: { type: String, default: "" },
      invoiceNumber: { type: String, default: "" },
      invoiceDate: { type: String, default: "" },
      placeOfSupply: { type: String, default: "" },
      paymentMode: { type: String, default: "" },
      companyName: { type: String, default: "" },
      companyAddress: { type: String, default: "" },
      companyCin: { type: String, default: "" },
      companyPan: { type: String, default: "" },
      companyFssai: { type: String, default: "" },
      companyEmail: { type: String, default: "" },
      companyPhone: { type: String, default: "" },
      authorizedSignatory: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);