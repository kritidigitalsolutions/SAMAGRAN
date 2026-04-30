import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
  createPanditBookingRazorpayOrder,
  confirmPanditBookingPayment,
  createPanditBooking,
  cancelPanditBookingByUser,
  reschedulePanditBookingByUser,
  gettemplesForBooking,
  getMyPanditBookings,
  getPanditAvailableSlots,
  getPanditBookingById,
  getPanditBookingProfile,
  getPanditsForBooking,
  getRitualsForBooking,
} from "../../controllers/panditBooking.controller.js";

const router = express.Router();

router.get("/rituals", getRitualsForBooking);
router.get("/temples", gettemplesForBooking);
router.get("/pandits", getPanditsForBooking);
router.get("/pandits/:panditId", getPanditBookingProfile);
router.get("/slots", getPanditAvailableSlots);

router.post("/", protect, createPanditBooking);
router.post("/:bookingId/payment/razorpay/order", protect, createPanditBookingRazorpayOrder);
router.patch("/:bookingId/cancel", protect, cancelPanditBookingByUser);
router.patch("/:bookingId/reschedule", protect, reschedulePanditBookingByUser);
router.get("/my", protect, getMyPanditBookings);
router.get("/:bookingId", protect, getPanditBookingById);
router.post("/:bookingId/confirm-payment", protect, confirmPanditBookingPayment);

export default router;



