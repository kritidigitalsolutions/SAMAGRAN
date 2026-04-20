import express from "express";
import {
  completePanditProfile,
  getPanditProfile,
  requestPanditOtp,
  updatePanditProfile,
  verifyPanditOtp,
} from "../controllers/pandit.auth.controller.js";
import { protectPandit } from "../middleware/pandit.middleware.js";
import { upload } from "../middleware/upload.js";
import {
  approvePanditBooking as approveAssignedBooking,
  deletePanditBooking as deleteAssignedBooking,
  getPanditAssignedBookings as getAssignedBookings,
  rejectPanditBooking as rejectAssignedBooking,
} from "../controllers/panditBooking.controller.js";

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

router.get("/bookings", protectPandit, getAssignedBookings);
router.patch("/bookings/:bookingId/approve", protectPandit, approveAssignedBooking);
router.patch("/bookings/:bookingId/reject", protectPandit, rejectAssignedBooking);
router.delete("/bookings/:bookingId", protectPandit, deleteAssignedBooking);

export default router;
