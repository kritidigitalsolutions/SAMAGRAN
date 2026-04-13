import express from "express";
import {
  signup,
  login,
  verifyOtp,
  resendOtp,
} from "../../controllers/auth.controller.js";

const router = express.Router();
import { upload } from "../../middleware/upload.js";

router.post("/signup", upload.single("profileImage"), signup);

// router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

export default router;