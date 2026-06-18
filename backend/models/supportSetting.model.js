import mongoose from "mongoose";

const supportSettingSchema = new mongoose.Schema(
  {
    whatsappNo: { type: String, default: "+91-9988776655" },
    callNo: { type: String, default: "+91-9988776655" },
    email: { type: String, default: "support@samagran.com" },
  },
  { timestamps: true }
);

export default mongoose.model("SupportSetting", supportSettingSchema);
