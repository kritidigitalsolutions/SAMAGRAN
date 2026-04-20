import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
	createRazorpayOrder,
	placeOrder,
} from "../../controllers/order.controller.js";

const router = express.Router();

router.post("/payment/razorpay/order", protect, createRazorpayOrder);
router.post("/place", protect, placeOrder);

export default router;