import mongoose from "mongoose";

const bookingAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: "" },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pinCode: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const ritualSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const timeSlotSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
  },
  { _id: false }
);

const panditBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pandit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pandit",
      required: true,
    },
    assignType: {
      type: String,
      enum: ["bestAvailable", "choosePandit"],
      default: "bestAvailable",
    },
    ritual: {
      type: ritualSchema,
      required: true,
    },
    bookingMode: {
      type: String,
      enum: ["homeVisit", "onlinePooja", "templeRitual"],
      required: true,
    },
    bookingDate: {
      type: String,
      required: true,
    },
    timeSlot: {
      type: timeSlotSchema,
      required: true,
    },
    address: {
      type: bookingAddressSchema,
      default: () => ({}),
    },
    dakshinaAmount: {
      type: Number,
      default: 0,
    },
    recommendedKit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DefaultKit",
      default: null,
    },
    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      method: {
        type: String,
        default: "UPI",
      },
      transactionId: {
        type: String,
        default: "",
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
    bookingStatus: {
      type: String,
      enum: ["requested", "confirmed", "cancelled", "completed"],
      default: "requested",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PanditBooking", panditBookingSchema);
