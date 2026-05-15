import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  createDeliveryBoy,
  deleteDeliveryBoy,
  getAllDeliveryBoys,
  updateDeliveryBoy,
} from "../../controllers/admin/deliveryBoy.controller.js";

const router = express.Router();

router.get("/delivery-boys", protectAdmin, getAllDeliveryBoys);
router.post("/delivery-boys", protectAdmin, createDeliveryBoy);
router.put("/delivery-boys/:id", protectAdmin, updateDeliveryBoy);
router.delete("/delivery-boys/:id", protectAdmin, deleteDeliveryBoy);

export default router;
