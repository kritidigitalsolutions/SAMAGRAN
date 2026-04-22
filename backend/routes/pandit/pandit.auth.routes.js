import express from "express";
import {
  completePanditProfile,
  getPanditProfile,
  requestPanditOtp,
  updatePanditProfile,
  verifyPanditOtp,
} from "../../controllers/pandit.auth.controller.js";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import { upload } from "../../middleware/upload.js";

const router = express.Router();

router.post("/send-otp", requestPanditOtp);
router.post("/verify-otp", verifyPanditOtp);

router.get("/profile", protectPandit, getPanditProfile);
router.patch(
  "/profile",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "profile", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
    { name: "aadhaarFrontImage", maxCount: 1 },
    { name: "aadhaarBackImage", maxCount: 1 },
  ]),
  updatePanditProfile
);
router.patch(
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

export default router;
