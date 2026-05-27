import express from "express";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import {
  getPanditWallet,
  getPanditWalletTransactions,
} from "../../controllers/pandit/pandit.wallet.controller.js";

const router = express.Router();

router.get("/", protectPandit, getPanditWallet);
router.get("/transactions", protectPandit, getPanditWalletTransactions);

export default router;
