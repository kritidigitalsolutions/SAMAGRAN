import express from "express";
import { protectAdmin, requireSuperAdmin } from "../../middleware/admin.middleware.js";
import {
	createPanditByAdmin,
	deletePanditByAdmin,
	getAllPanditsForAdmin,
	getPanditBookingsByAdmin,
	getPanditDetailsForAdmin,
	updatePanditByAdmin,
	updatePanditStatusByAdmin,
} from "../../controllers/admin/pandit.controller.js";
import { getPanditEarningsSummary, markAllPanditPayoutsPaid } from "../../controllers/admin/panditEarnings.controller.js";

const router = express.Router();

router.get("/earnings", protectAdmin, getPanditEarningsSummary);
router.patch("/mark-all-payout-paid/:panditId", protectAdmin, requireSuperAdmin, markAllPanditPayoutsPaid);
router.get("/", protectAdmin, getAllPanditsForAdmin);
router.post("/", protectAdmin, createPanditByAdmin);
router.get("/:id/details", protectAdmin, getPanditDetailsForAdmin);
router.get("/:id/bookings", protectAdmin, getPanditBookingsByAdmin);
router.patch("/:id", protectAdmin, updatePanditByAdmin);
router.patch("/:id/status", protectAdmin, updatePanditStatusByAdmin);
router.delete("/:id", protectAdmin, deletePanditByAdmin);

export default router;
