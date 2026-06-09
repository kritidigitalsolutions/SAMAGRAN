import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    time: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "available",
    },
  },
  { _id: false }
);

const availabilityEntrySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    status: {
      type: String,
      // enum: ["available", "booked", "not_available"],
      required: true,
      trim: true,
    },
    slots: {
      type: [timeSlotSchema],
      default: [],
    },
  },
  { _id: false }
);

const panditAvailabilitySchema = new mongoose.Schema(
  {
    pandit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pandit",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    availability: {
      type: [availabilityEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

panditAvailabilitySchema.index({ pandit: 1, year: 1, month: 1 }, { unique: true });

export default mongoose.model("PanditAvailability", panditAvailabilitySchema);
