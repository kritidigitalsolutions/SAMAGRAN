// models/admin.model.js
import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name:{type: String,required:true},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fcmToken: { type: String, trim: true, default: "" },
  fcmTokenUpdatedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);