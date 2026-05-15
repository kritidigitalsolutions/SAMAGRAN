import express from "express";
import {
  getDeliveryProfile,
  requestDeliveryOtp,
  verifyDeliveryOtp,
} from "../../controllers/delivery/delivery.auth.controller.js";
import { protectDelivery } from "../../middleware/delivery.middleware.js";

const router = express.Router();

router.post("/send-otp", requestDeliveryOtp);
router.post("/verify-otp", verifyDeliveryOtp);
router.get("/profile", protectDelivery, getDeliveryProfile);

export default router;
