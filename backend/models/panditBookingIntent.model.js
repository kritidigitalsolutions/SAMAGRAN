import mongoose from "mongoose";

const panditBookingIntentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "consumed"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// Auto cleanup expired pending intents.
panditBookingIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PanditBookingIntent", panditBookingIntentSchema);
