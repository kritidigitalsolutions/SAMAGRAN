import express from "express";
import {
  setBookingPrice,
  getBookingPrice,
  togglePricingStatus,
} from "../../controllers/admin/bookingPricingController.js";

const router = express.Router();

router.get("/price", getBookingPrice);

// 👉 ADMIN
router.post("/price", setBookingPrice);
router.put("/price/:id/toggle", togglePricingStatus);

export default router;