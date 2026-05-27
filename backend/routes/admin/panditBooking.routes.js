import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
	deletePanditBookingByAdmin,
	getAllPanditBookingsForAdmin,
	updatePanditBookingByAdmin,
    createZoomMeetingForBookingByAdmin,
} from "../../controllers/admin/panditBooking.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllPanditBookingsForAdmin);
router.patch("/:id", protectAdmin, updatePanditBookingByAdmin);
router.delete("/:id", protectAdmin, deletePanditBookingByAdmin);
router.post("/:id/zoom/create", protectAdmin, createZoomMeetingForBookingByAdmin);

export default router;
