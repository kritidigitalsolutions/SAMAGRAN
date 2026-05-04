import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from "../../controllers/admin/coupon.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getCoupons);
router.post("/", protectAdmin, createCoupon);
router.put("/:id", protectAdmin, updateCoupon);
router.delete("/:id", protectAdmin, deleteCoupon);

export default router;
