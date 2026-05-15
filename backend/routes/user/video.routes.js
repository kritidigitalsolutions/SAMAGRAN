import express from "express";
import protect, { protectUserOrPandit } from "../../middleware/auth.middleware.js";
import { generateToken, startCall, endCall, getCall } from "../../controllers/video.controller.js";

const router = express.Router();

// Generate an Agora RTC token for a given channel
router.post("/token", protectUserOrPandit, generateToken);

// Create a call session (initiated by user)
router.post("/start", protectUserOrPandit, startCall);

// End a call session
router.post("/:id/end", protectUserOrPandit, endCall);

// Get call details
router.get("/:id", protectUserOrPandit, getCall);

export default router;
