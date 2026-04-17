import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { getAllPanditBookingsForAdmin } from "../../controllers/admin/panditBooking.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllPanditBookingsForAdmin);

export default router;
