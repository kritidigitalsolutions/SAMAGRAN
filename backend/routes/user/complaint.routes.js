import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { createComplaint, getMyComplaints, getComplaintByOrder } from "../../controllers/admin/complaint.controller.js";

const router = express.Router();

router.post("/", protect, createComplaint);
router.get("/", protect, getMyComplaints);
router.get("/order/:orderId", protect, getComplaintByOrder);

export default router;
