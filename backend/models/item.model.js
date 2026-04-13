import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String },

     category: {
      name: String,
    },

    pricing: {
      price: { type: Number, required: true },
      mrp: { type: Number }
      ,
      currency: { type: String, default: "INR" }
    },

    media: {
      Images: [String],
    },

    ratings: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 }
    },

    stock: {
      quantity: { type: Number, default: 0 }
    },

    tags: [String],

    flags: {
      isRecommended: { type: Boolean, default: false }
    },

    // delivery: {
    //   freeDelivery: { type: Boolean, default: false },
    //   estimatedDays: { type: Number, default: 3 }
    // },

    status: { type: String, default: "active" }

  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);