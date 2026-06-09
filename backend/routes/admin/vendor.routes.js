import express from "express";
import { protectAdmin, requireSuperAdmin } from "../../middleware/admin.middleware.js";
import {
  approveVendor,
  createVendor,
  getVendorById,
  listVendors,
  updateVendor,
  updateVendorPageAccess,
  deleteVendor,
} from "../../controllers/admin/vendor.controller.js";

const router = express.Router();

router.get("/vendors", protectAdmin, requireSuperAdmin, listVendors);
router.get("/vendors/:id", protectAdmin, requireSuperAdmin, getVendorById);
router.post("/vendors", protectAdmin, requireSuperAdmin, createVendor);
router.patch("/vendors/:id", protectAdmin, requireSuperAdmin, updateVendor);
router.patch("/vendors/:id/approve", protectAdmin, requireSuperAdmin, approveVendor);
router.patch("/vendors/:id/page-access", protectAdmin, requireSuperAdmin, updateVendorPageAccess);
router.delete("/vendors/:id", protectAdmin, requireSuperAdmin, deleteVendor);

export default router;

