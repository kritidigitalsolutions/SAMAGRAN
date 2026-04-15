import express from "express";
import protect from "../../middleware/auth.middleware.js";

import {
  createUserKit,
  getMyKits,
  checkoutUserKit,
  createUserKitFromDefaultKit,
  updateUserKitItems,
} from "../../controllers/userKit.controller.js";

const router = express.Router();

// Create custom user kit (saved as draft)
router.post("/", protect, createUserKit);

// Get my kits (default: draft)
router.get("/my-kits", protect, getMyKits);

// Create a customizable draft from a selected default kit
router.post("/from-default/:defaultKitId", protect, createUserKitFromDefaultKit);

// Update products in a draft user kit
router.put("/:userKitId/items", protect, updateUserKitItems);

// Checkout draft kit
router.post("/:userKitId/checkout", protect, checkoutUserKit);

export default router;