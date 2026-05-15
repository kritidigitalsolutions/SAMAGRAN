import express from "express";
import { protectDelivery } from "../../middleware/delivery.middleware.js";
import {
  getAssignedOrders,
  updateDeliveryOrderStatus,
} from "../../controllers/delivery/delivery.order.controller.js";

const router = express.Router();

router.get("/orders", protectDelivery, getAssignedOrders);
router.patch("/orders/:id/status", protectDelivery, updateDeliveryOrderStatus);

export default router;
