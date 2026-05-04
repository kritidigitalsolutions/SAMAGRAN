import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
	createPanditByAdmin,
	deletePanditByAdmin,
	getAllPanditsForAdmin,
	getPanditBookingsByAdmin,
	getPanditDetailsForAdmin,
	updatePanditByAdmin,
	updatePanditStatusByAdmin,
} from "../../controllers/admin/pandit.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllPanditsForAdmin);
router.post("/", protectAdmin, createPanditByAdmin);
router.get("/:id/details", protectAdmin, getPanditDetailsForAdmin);
router.get("/:id/bookings", protectAdmin, getPanditBookingsByAdmin);
router.patch("/:id", protectAdmin, updatePanditByAdmin);
router.patch("/:id/status", protectAdmin, updatePanditStatusByAdmin);
router.delete("/:id", protectAdmin, deletePanditByAdmin);

export default router;
