import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { generateToken, startCall, endCall, getCall } from "../../controllers/video.controller.js";

const router = express.Router();

// Generate an Agora RTC token for a given channel
router.post("/token", protect, generateToken);

// Create a call session (initiated by user)
router.post("/start", protect, startCall);

// End a call session
router.post("/:id/end", protect, endCall);

// Get call details
router.get("/:id", protect, getCall);

export default router;
