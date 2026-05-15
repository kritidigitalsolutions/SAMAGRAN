import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  assignDeliveryBoyToOrder,
  deleteOrderByAdmin,
  getAllOrdersForAdmin,
  getOrderByIdForAdmin,
  updateOrderByAdmin,
  updateOrderTrackingByAdmin,
} from "../../controllers/admin/order.controller.js";

const router = express.Router();
router.get("/", protectAdmin, getAllOrdersForAdmin);
router.get("/:id", protectAdmin, getOrderByIdForAdmin);
router.put("/:id", protectAdmin, updateOrderByAdmin);
router.patch("/:id/tracking", protectAdmin, updateOrderTrackingByAdmin);
router.patch("/:id/assign-delivery", protectAdmin, assignDeliveryBoyToOrder);
router.delete("/:id", protectAdmin, deleteOrderByAdmin);

export default router;
