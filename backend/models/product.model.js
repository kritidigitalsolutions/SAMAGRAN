import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    itemCode: { type: String, unique: true, index: true, sparse: true },
    title: { type: String, required: true },
    slug: { type: String },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    category: {
      name: String,
      subCategory: String,
    },

    description: { type: String, trim: true, default: "" },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
      index: true,
    },

    details: {
      brand: { type: String, trim: true, default: "" },
      subBrand: { type: String, trim: true, default: "" },
      unit: { type: String, trim: true, default: "" },
      weight: { type: String, trim: true, default: "" },
      dimensions: { type: String, trim: true, default: "" },
      material: { type: String, trim: true, default: "" },
      color: { type: String, trim: true, default: "" },
      manufacturer: { type: String, trim: true, default: "" },
      countryOfOrigin: { type: String, trim: true, default: "" },
      packageContents: { type: String, trim: true, default: "" },
      usageInstructions: { type: String, trim: true, default: "" },
      careInstructions: { type: String, trim: true, default: "" },
      expiryInfo: { type: String, trim: true, default: "" },
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

    discount: {
      type: {
        type: String,
        enum: ["percent", "flat"],
        default: "percent",
      },
      value: { type: Number, default: 0 },
      isActive: { type: Boolean, default: false },
      startsAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
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
      counts: {
        rating1: { type: Number, default: 0 },
        rating2: { type: Number, default: 0 },
        rating3: { type: Number, default: 0 },
        rating4: { type: Number, default: 0 },
        rating5: { type: Number, default: 0 },
      },
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

itemSchema.pre("save", async function generateItemCode() {
  if (this.itemCode) {
    return;
  }

  let candidate = "";
  let exists = true;

  while (exists) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    candidate = `PROD${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    exists = await this.constructor.exists({ itemCode: candidate });
  }

  this.itemCode = candidate;
});

export default mongoose.model("Item", itemSchema);
