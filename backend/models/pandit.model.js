import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: "" },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pinCode: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const aadhaarSchema = new mongoose.Schema(
  {
    number: { type: String, trim: true, default: "" },
    frontImage: { type: String, trim: true, default: "" },
    backImage: { type: String, trim: true, default: "" },
    consentGiven: { type: Boolean, default: false },
    // verificationStatus: {
    //   type: String,
    //   enum: ["pending", "verified", "rejected"],
    //   default: "pending",
    // },
  },
  { _id: false }
);

const serviceTypeSchema = new mongoose.Schema(
  {
    onlinePooja: { type: Boolean, default: false },
    homeVisit: { type: Boolean, default: false },
    atTemple: { type: Boolean, default: false },
    travelForSpecialPoojas: { type: Boolean, default: false },
    detectedLocation: {
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
    },
    serviceDistance: {
      selected: {
        type: String,
        enum: ["within5", "within10", "within25", "within50", "custom", ""],
        default: "",
      },
      customKm: { type: Number, default: 0 },
    },
    outstationAvailability: {
      withinDistrict: { type: Boolean, default: false },
      withinState: { type: Boolean, default: false },
      anywhereInIndia: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const customSamagriItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, trim: true, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    size: { type: String, trim: true, default: "" },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, trim: true, default: "" },
  },
  { _id: true, timestamps: false }
);

const poojaOfferingSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    isSelected: { type: Boolean, default: false },
    durationHours: { type: Number, default: 2 },
    travelForSpecialPooja: { type: Boolean, default: false },
    standardSamagri: { type: Boolean, default: false },
    customSamagri: { type: Boolean, default: false },
    customSamagriItems: {
      type: [customSamagriItemSchema],
      default: [],
    },
  },
  { _id: false }
);

const panditSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    profileImage: {
      type: String,
      trim: true,
      default: "",
    },

    fcmToken: {
      type: String,
      trim: true,
      default: "",
    },

    fcmTokenUpdatedAt: {
      type: Date,
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    address: {
      type: addressSchema,
      default: () => ({}),
    },

    yearsOfExperience: {
      type: Number,
      default: 0,
    },

    templeAssociated: {
      type: String,
      trim: true,
      default: "",
    },

    languagesSpoken: {
      type: [String],
      default: [],
    },

    aadhaar: {
      type: aadhaarSchema,
      default: () => ({}),
    },

    serviceTypes: {
      type: serviceTypeSchema,
      default: () => ({}),
    },

    poojaOfferings: {
      type: [poojaOfferingSchema],
      default: [],
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "active", "blocked"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Pandit", panditSchema);
