import express from "express";
import {
  completePanditProfile,
  getPanditProfile,
  requestPanditOtp,
  updatePanditProfile,
  updatePanditFcmToken,
  verifyPanditOtp,
} from "../../controllers/pandit/pandit.auth.controller.js";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import { upload } from "../../middleware/upload.js";

const router = express.Router();

router.post("/send-otp", requestPanditOtp);
router.post("/verify-otp", verifyPanditOtp);
router.patch("/fcm-token", protectPandit, updatePanditFcmToken);

router.get("/profile", protectPandit, getPanditProfile);

router.post(
  "/complete-profile",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "profile", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
    { name: "aadhaarFrontImage", maxCount: 1 },
    { name: "aadhaarBackImage", maxCount: 1 },
  ]),
  completePanditProfile
);

router.patch(
  "/profile-edit",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "profile", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
    { name: "aadhaarFrontImage", maxCount: 1 },
    { name: "aadhaarBackImage", maxCount: 1 },
  ]), protectPandit, 
  updatePanditProfile
);
export default router;
