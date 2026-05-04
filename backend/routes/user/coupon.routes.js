import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { applyCoupon } from "../../controllers/coupon.controller.js";

const router = express.Router();

router.post("/apply", protect, applyCoupon);

export default router;
