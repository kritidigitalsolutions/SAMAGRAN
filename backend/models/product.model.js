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
      mrp: { type: Number },
      currency: { type: String, default: "INR" },
      basePrice: { type: Number, default: 0 },
      gstPercent: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      priceIncludesGst: { type: Boolean, default: true },
    },

    compliance: {
      hsnCode: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
    },

    media: {
      image: [String],
    },

    ratings: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    stock: {
      quantity: { type: Number, default: 0 },
    },

    tags: [String],

    flags: {
      isRecommended: { type: Boolean, default: false },
      isMostPoojaEssentials: { type: Boolean, default: false },
      isMostUsed: { type: Boolean, default: false },
      isEveryDayRitual: { type: Boolean, default: false },
      isRitualItems: { type: Boolean, default: false },
    },

    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
