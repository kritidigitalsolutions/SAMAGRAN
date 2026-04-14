import express from "express";
import protect from "../../middleware/auth.middleware.js";

import {
  createUserKit,
  getMyKits,
  checkoutUserKit,
} from "../../controllers/userKit.controller.js";

const router = express.Router();

// Create custom user kit (saved as draft)
router.post("/", protect, createUserKit);

// Get my kits (default: draft)
router.get("/my-kits", protect, getMyKits);

// Checkout draft kit
router.post("/:userKitId/checkout", protect, checkoutUserKit);

export default router;