import mongoose from "mongoose";

const bookingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    secondPhone: {type: String, trim: true, default: "" },
    fullAddress: { type: String, trim: true, default: "" },
    email: {type: String, default: "" },
    addressType: { type: String, trim: true, default: "others" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const ritualSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const timeSlotSchema = new mongoose.Schema(
  {
    dateAndTime:[
      {
       date: String,
       time: String,
     },
    ]
  },
  { _id: false },
);

const templeSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    line1: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
  },
  { _id: false },
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
    // assignType: {
    //   type: String,
    //   enum: ["bestAvailable", "choosePandit"],
    //   default: "bestAvailable",
    // },
    ritual: {
      type: ritualSchema,
      required: true,
    },
    ritualRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ritual",
      default: null,
    },
    bookingMode: {
      type: String,
      // enum: ["homeVisit", "onlinePooja", "templeRitual"],
      required: true,
    },
    bookingDate: {
      type: String,
      required: true,
    },
    dateAndTime: {
      type: timeSlotSchema,
      required: true,
    },
    address: {
      type: bookingAddressSchema,
      default: () => ({}),
    },
    temple: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "temple",
      default: null,
    },
    templeSnapshot: {
      type: templeSnapshotSchema,
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
    price: Number,
    payment: {
      status: {
        type: String,
        // enum: ["pending", "paid", "failed"],
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
      gateway: {
        type: String,
        default: "",
      },
      razorpayOrderId: {
        type: String,
        default: "",
      },
      razorpayPaymentId: {
        type: String,
        default: "",
      },
      razorpaySignature: {
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
      // enum: ["requested", "confirmed", "cancelled", "completed"],
      default: "requested",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    panditDecision: {
      samagriType: {
        type: String,
        // enum: ["standard", "customize", ""],
        default: "",
      },
      rejectReasonType: {
        type: String,
        // enum: [
        //   "time_slot_already_booked",
        //   "location_too_far",
        //   "pooja_not_performed",
        //   "unavailable_personal",
        //   "other",
        //   "",
        // ],
        default: "",
      },
      rejectReasonText: {
        type: String,
        trim: true,
        default: "",
      },
      note: {
        type: String,
        trim: true,
        default: "",
      },
      decidedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model("PanditBooking", panditBookingSchema);
