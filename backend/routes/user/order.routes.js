import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
	addSavedAddress,
	createRazorpayOrder,
	deleteSavedAddress,
	getMyOrders,
	getOrderTracking,
	getSavedAddresses,
	placeOrder,
	updateSavedAddress,
} from "../../controllers/order.controller.js";

const router = express.Router();

router.post("/payment/razorpay/order", protect, createRazorpayOrder);
router.post("/place", protect, placeOrder);
router.get("/my", protect, getMyOrders);
router.get("/:orderId/tracking", protect, getOrderTracking);
router.get("/addresses", protect, getSavedAddresses);
router.post("/addresses", protect, addSavedAddress);
router.patch("/addresses/:addressId", protect, updateSavedAddress);
router.delete("/addresses/:addressId", protect, deleteSavedAddress);

export default router;