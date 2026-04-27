import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
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

const panditUploadFields = upload.fields([
	{ name: "profileImageFile", maxCount: 1 },
	{ name: "aadhaarFrontImageFile", maxCount: 1 },
	{ name: "aadhaarBackImageFile", maxCount: 1 },
]);

router.get("/", protectAdmin, getAllPanditsForAdmin);
router.post("/", protectAdmin, panditUploadFields, createPanditByAdmin);
router.get("/:id/details", protectAdmin, getPanditDetailsForAdmin);
router.get("/:id/bookings", protectAdmin, getPanditBookingsByAdmin);
router.patch("/:id", protectAdmin, panditUploadFields, updatePanditByAdmin);
router.patch("/:id/status", protectAdmin, updatePanditStatusByAdmin);
router.delete("/:id", protectAdmin, deletePanditByAdmin);

export default router;
