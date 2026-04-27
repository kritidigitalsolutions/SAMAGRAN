import mongoose from "mongoose";
import slugify from "slugify";

const defaultKitItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const defaultKitSchema = new mongoose.Schema(
  {
    kitType: {
      type: String,
      enum: ["default", "special"],
      default: "default",
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
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    items: {
      type: [defaultKitItemSchema],
      default: [],
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    kitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    savings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

defaultKitSchema.pre("save", function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
});

export default mongoose.model("DefaultKit", defaultKitSchema);
