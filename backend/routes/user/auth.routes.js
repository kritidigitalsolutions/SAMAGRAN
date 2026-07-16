import express from "express";
import {
  signup,
  login,
  verifyOtp,
  resendOtp,
  updateUserFcmToken,
} from "../../controllers/auth.controller.js";
import protect, { protectUserOrPandit } from "../../middleware/auth.middleware.js";

const router = express.Router();
import { upload } from "../../middleware/upload.js";

router.post("/signup", upload.single("profileImage"), signup);

// router.post("/signup", signup);
router.post("/send-otp", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.patch("/fcm-token", protectUserOrPandit, updateUserFcmToken);

export default router;