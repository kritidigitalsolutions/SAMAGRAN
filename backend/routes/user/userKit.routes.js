import express from "express";

import {
  createUserKit,
  getMyKits,
  checkoutUserKit,
  updateUserKitItems,
  deleteMyUserKit,
} from "../../controllers/userKit.controller.js";
import protect from "../../middleware/auth.middleware.js";
import {  createUserKitFromDefaultKit} from "../../controllers/userKit.controller.js";

const router = express.Router();

// Create custom user kit (saved as draft)
router.post("/", protect, createUserKit);

// Get my kits (default: draft)
router.get("/my-kits", protect, getMyKits);


// Update products in a draft user kit
router.put("/:userKitId/items", protect, updateUserKitItems);

// Checkout draft kit
router.post("/:userKitId/checkout", protect, checkoutUserKit);

// Delete draft kit
router.delete("/:userKitId", protect, deleteMyUserKit);
// Create a customizable draft from a selected default kit
router.post("/from-default/:defaultKitId", protect, createUserKitFromDefaultKit);

export default router;