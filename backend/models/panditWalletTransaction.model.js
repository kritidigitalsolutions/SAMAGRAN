import mongoose from "mongoose";

const panditWalletTransactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanditWallet",
      required: true,
    },
    pandit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pandit",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    source: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    meta: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PanditWalletTransaction", panditWalletTransactionSchema);
