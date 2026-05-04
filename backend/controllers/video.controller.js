import dotenv from "dotenv";
dotenv.config();

import VideoCall from "../models/videoCall.model.js";
import User from "../models/user.model.js";
import Pandit from "../models/pandit.model.js";

// Try to import Agora token builder. If not installed, instruct user later.
let RtcTokenBuilder;
let RtcRole;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  ({ RtcTokenBuilder, RtcRole } = await import("agora-access-token"));
} catch (err) {
  // will handle missing package at runtime
}

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERTIFICATE;

// Utility to create a token. Uses uid (number) or account (string) fallback.
export const buildRtcToken = ({ channelName, uid = 0, expireSeconds = 3600 }) => {
  if (!APP_ID || !APP_CERT) {
    throw new Error("Agora credentials not configured");
  }

  if (!RtcTokenBuilder) {
    throw new Error("agora-access-token package not installed. Run: npm i agora-access-token");
  }

  const role = (RtcRole && RtcRole.PUBLISHER) || (RtcTokenBuilder && RtcTokenBuilder.Role && RtcTokenBuilder.Role.PUBLISHER) || 1;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + Number(expireSeconds || 3600);

  // If uid is numeric
  if (Number.isFinite(Number(uid)) && String(uid).trim() !== "") {
    const intUid = Number(uid);
    return RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERT, channelName, intUid, role, privilegeExpiredTs);
  }

  // fallback to user account string token
  return RtcTokenBuilder.buildTokenWithAccount(APP_ID, APP_CERT, channelName, String(uid || "user"), role, privilegeExpiredTs);
};

export const generateToken = async (req, res) => {
  try {
    const { channelName, uid, expireSeconds } = req.body || {};

    if (!channelName) {
      return res.status(400).json({ success: false, message: "channelName is required" });
    }

    const token = buildRtcToken({ channelName, uid, expireSeconds });

    return res.json({ success: true, data: { appId: APP_ID, token, channelName, uid: uid || 0 } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const startCall = async (req, res) => {
  try {
    const { channelName, calleeId, uid, meta } = req.body || {};
    const callerId = req.user?._id || req.user?.id;

    if (!callerId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!channelName) return res.status(400).json({ success: false, message: "channelName is required" });

    const call = await VideoCall.create({ channelName, callerId, calleeId, uid: uid || 0, meta, status: "initiated" });

    return res.status(201).json({ success: true, data: call });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const endCall = async (req, res) => {
  try {
    const { id } = req.params;
    const call = await VideoCall.findById(id);
    if (!call) return res.status(404).json({ success: false, message: "Call not found" });

    call.endedAt = new Date();
    call.status = "ended";
    await call.save();

    return res.json({ success: true, data: call });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCall = async (req, res) => {
  try {
    const { id } = req.params;
    const call = await VideoCall.findById(id).populate("callerId", "name email").populate("calleeId", "name email");
    if (!call) return res.status(404).json({ success: false, message: "Call not found" });

    return res.json({ success: true, data: call });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default { generateToken, startCall, endCall, getCall };
