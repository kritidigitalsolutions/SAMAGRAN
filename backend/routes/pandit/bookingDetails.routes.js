import express from "express";

import { protectPandit } from "../../middleware/pandit.middleware.js";
import {
  approvePanditBooking as approveAssignedBooking,
  deletePanditBooking as deleteAssignedBooking,
  getPanditAssignedBookings as getAssignedBookings,
  rejectPanditBooking as rejectAssignedBooking,
} from "../../controllers/panditBooking.controller.js";

const router = express.Router();

router.get("/bookings", protectPandit, getAssignedBookings);
router.patch("/bookings/:bookingId/approve", protectPandit, approveAssignedBooking);
router.patch("/bookings/:bookingId/reject", protectPandit, rejectAssignedBooking);
router.delete("/bookings/:bookingId", protectPandit, deleteAssignedBooking);

export default router;
