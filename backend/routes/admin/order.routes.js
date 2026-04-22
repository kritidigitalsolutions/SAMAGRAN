import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
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
router.delete("/:id", protectAdmin, deleteOrderByAdmin);

export default router;
