import express from "express";
import { protectAdmin, requireSuperAdmin } from "../../middleware/admin.middleware.js";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from "../../controllers/admin/coupon.controller.js";

const router = express.Router();

router.get("/", protectAdmin, requireSuperAdmin, getCoupons);
router.post("/", protectAdmin, requireSuperAdmin, createCoupon);
router.put("/:id", protectAdmin, requireSuperAdmin, updateCoupon);
router.delete("/:id", protectAdmin, requireSuperAdmin, deleteCoupon);

export default router;
