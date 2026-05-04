import mongoose from "mongoose";

const notificationRecipientSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["admin", "user", "pandit"],
      default: "user",
    },
    ids: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    body: { type: String, trim: true, default: "" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    audience: {
      type: notificationRecipientSchema,
      default: () => ({ type: "user", ids: [] }),
    },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["sent", "partial", "skipped", "failed"],
      default: "sent",
    },
    error: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);