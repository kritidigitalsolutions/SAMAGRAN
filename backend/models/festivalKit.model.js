import mongoose from "mongoose";
import slugify from "slugify";

const kitItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
});

const festivalKitSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    kitType: {
      type: String,
      enum: ["Customize", "Samagran kit", "default", "special"],
      default: "Samagran kit",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: String,
    image: String,

    // category: {
    //   type: String,
    //   trim: true,
    //   default: "",
    // },

    isMostPopularKit: {
      type: Boolean,
      default: false,
    },
    isMostUserUse: {
      type: Boolean,
      default: false,
    },
    isPanditApproved: {
      type: Boolean,
      default: false,
    },

    items: [kitItemSchema],

    totalPrice: Number,
    kitPrice: Number,
    savings: Number,

    festivalType: String,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// safest hook: no next parameter
festivalKitSchema.pre("save", function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
});

export default mongoose.model("FestivalKit", festivalKitSchema);
