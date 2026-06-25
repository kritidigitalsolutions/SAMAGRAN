import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  getPanditComplaints,
  respondToPanditComplaint,
} from "../../controllers/admin/panditComplaint.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getPanditComplaints);
router.patch("/:complaintId/respond", protectAdmin, respondToPanditComplaint);

export default router;
