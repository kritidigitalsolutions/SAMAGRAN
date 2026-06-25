import express from "express";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import {
  createPanditComplaint,
  getMyPanditComplaints,
  getComplaintByBooking,
} from "../../controllers/pandit/complaint.controller.js";

const router = express.Router();

router.post("/", protectPandit, createPanditComplaint);
router.get("/", protectPandit, getMyPanditComplaints);
router.get("/booking/:bookingId", protectPandit, getComplaintByBooking);

export default router;
