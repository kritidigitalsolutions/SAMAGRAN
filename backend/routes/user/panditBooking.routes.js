import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
  confirmPanditBookingPayment,
  createPanditBooking,
  getMyPanditBookings,
  getPanditAvailableSlots,
  getPanditBookingById,
  getPanditBookingProfile,
  getPanditsForBooking,
  getRitualsForBooking,
} from "../../controllers/panditBooking.controller.js";

const router = express.Router();

router.get("/rituals", getRitualsForBooking);
router.get("/pandits", getPanditsForBooking);
router.get("/pandits/:panditId", getPanditBookingProfile);
router.get("/slots", getPanditAvailableSlots);

router.post("/", protect, createPanditBooking);
router.get("/my", protect, getMyPanditBookings);
router.get("/:bookingId", protect, getPanditBookingById);
router.post("/:bookingId/confirm-payment", protect, confirmPanditBookingPayment);

export default router;



