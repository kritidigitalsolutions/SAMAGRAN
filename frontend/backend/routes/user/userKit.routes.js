import express from "express";
import protect from "../../middleware/auth.middleware.js";

import {
  orderFromKit,
  customOrder,
  getMyKits,
  checkoutUserKit,
} from "../../controllers/userKit.controller.js";

const router = express.Router();

// Save customized festival kit
router.post("/order-from-kit/:kitSlug", protect, orderFromKit);

// Save custom kit
router.post("/custom-order", protect, customOrder);

// Get my saved kits
router.get("/my-kits", protect, getMyKits);

// Checkout saved kit -> create real order
router.post("/checkout/:userKitId", protect, checkoutUserKit);

export default router;