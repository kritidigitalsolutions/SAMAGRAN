import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  createVendorWithdrawal,
  getVendorEarningsSummary,
  getVendorRefunds,
  getVendorTransactions,
  getVendorWithdrawals,
  getSuperAdminCommissionReport,
} from "../../controllers/admin/vendorFinance.controller.js";

const router = express.Router();

router.get("/vendor/earnings/summary", protectAdmin, getVendorEarningsSummary);
router.get("/vendor/transactions", protectAdmin, getVendorTransactions);
router.get("/vendor/withdrawals", protectAdmin, getVendorWithdrawals);
router.post("/vendor/withdrawals", protectAdmin, createVendorWithdrawal);
router.get("/vendor/refunds", protectAdmin, getVendorRefunds);
router.get("/vendor/commission-report", protectAdmin, getSuperAdminCommissionReport);

export default router;
