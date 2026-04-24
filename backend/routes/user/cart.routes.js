import express from "express";
import protect from "../../middleware/auth.middleware.js";

import {
  addToCart,
  removeFromCart,
  getCart,
  deleteCart,
  clearCart
} from "../../controllers/cart.controller.js";

const router = express.Router();

router.post("/add", protect, addToCart);
router.post("/remove", protect, removeFromCart);
// 👉 Delete single item (product wise)
// DELETE /api/cart/:productId
router.delete("/:productId", protect, deleteCart);

// 👉 Clear full cart
// DELETE /api/cart
router.delete("/", protect, clearCart);

router.get("/", protect, getCart);

export default router;