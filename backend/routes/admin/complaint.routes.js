import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { getComplaints, respondToComplaint } from "../../controllers/admin/complaint.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getComplaints);
router.patch("/:complaintId", protectAdmin, respondToComplaint);

export default router;
