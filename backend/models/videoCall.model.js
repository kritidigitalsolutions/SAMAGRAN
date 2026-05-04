import mongoose from "mongoose";

const VideoCallSchema = new mongoose.Schema({
  channelName: { type: String, required: true },
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  calleeId: { type: mongoose.Schema.Types.ObjectId, ref: "Pandit" },
  uid: { type: Number },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  status: { type: String, enum: ["initiated", "ongoing", "ended", "missed"], default: "initiated" },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.model("VideoCall", VideoCallSchema);
