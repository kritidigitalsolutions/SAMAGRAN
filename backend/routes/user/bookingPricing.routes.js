import express from "express";
import {
  getBookingPrice,
} from "../../controllers/bookingPricingController.js";

const router = express.Router();

// 👉 USER
router.get("/price", getBookingPrice);

export default router;