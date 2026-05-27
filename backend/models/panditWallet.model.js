import mongoose from "mongoose";

const panditWalletSchema = new mongoose.Schema(
  {
    pandit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pandit",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    payableBalance: {
      type: Number,
      default: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    isPayable: {
      type: Boolean,
      default: false,
    },
    lastPayoutAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PanditWallet", panditWalletSchema);
