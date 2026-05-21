import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  getVendorProfile,
  updateVendorPassword,
  updateVendorProfile,
} from "../../controllers/admin/vendorProfile.controller.js";

const router = express.Router();

router.get("/vendor/profile", protectAdmin, getVendorProfile);
router.patch("/vendor/profile", protectAdmin, updateVendorProfile);
router.patch("/vendor/password", protectAdmin, updateVendorPassword);

export default router;
