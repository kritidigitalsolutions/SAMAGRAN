import mongoose from "mongoose";

const ritualSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    durationHours: {
      type: Number,
      default: 2,
      min: 0,
    },
    travelForSpecialPooja: {
      type: Boolean,
      default: false,
    },
    standardSamagri: {
      type: Boolean,
      default: false,
    },
    customSamagri: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
  },
  { timestamps: true }
);

ritualSchema.index({ title: 1 }, { unique: true });

export default mongoose.model("Ritual", ritualSchema);
