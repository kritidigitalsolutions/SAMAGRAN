import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
	deletePanditBookingByAdmin,
	getAllPanditBookingsForAdmin,
	updatePanditBookingByAdmin,
} from "../../controllers/admin/panditBooking.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllPanditBookingsForAdmin);
router.patch("/:id", protectAdmin, updatePanditBookingByAdmin);
router.delete("/:id", protectAdmin, deletePanditBookingByAdmin);

export default router;
