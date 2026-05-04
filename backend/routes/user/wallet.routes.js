import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
  confirmWalletTopup,
  createWalletTopupOrder,
  getWallet,
  getWalletTransactions,
} from "../../controllers/wallet.controller.js";

const router = express.Router();

router.get("/", protect, getWallet);
router.get("/transactions", protect, getWalletTransactions);
router.post("/topup/razorpay/order", protect, createWalletTopupOrder);
router.post("/topup/confirm", protect, confirmWalletTopup);

export default router;
