import express from "express";
import { protectAdmin, requireSuperAdmin } from "../../middleware/admin.middleware.js";
import {
	deletePanditBookingByAdmin,
	getAllPanditBookingsForAdmin,
	updatePanditBookingByAdmin,
    createZoomMeetingForBookingByAdmin,
	createZoomTestMeeting,
} from "../../controllers/admin/panditBooking.controller.js";
import { markPanditPayoutPaid } from "../../controllers/admin/panditEarnings.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllPanditBookingsForAdmin);
router.patch("/:id", protectAdmin, updatePanditBookingByAdmin);
router.delete("/:id", protectAdmin, deletePanditBookingByAdmin);
router.post("/:id/zoom/create", protectAdmin, createZoomMeetingForBookingByAdmin);
router.post("/zoom/test", protectAdmin, createZoomTestMeeting);
router.patch("/:id/mark-payout-paid", protectAdmin, requireSuperAdmin, markPanditPayoutPaid);

export default router;
