import express from "express";
import { protectAdmin, requireSuperAdmin } from "../../middleware/admin.middleware.js";
import {
  createVendorWithdrawal,
  getVendorEarningsSummary,
  getVendorRefunds,
  getVendorTransactions,
  getVendorWithdrawals,
  getSuperAdminCommissionReport,
  deleteVendorTransaction,
  markWithdrawalPaid,
} from "../../controllers/admin/vendorFinance.controller.js";

const router = express.Router();

router.get("/vendor/earnings/summary", protectAdmin, getVendorEarningsSummary);
router.get("/vendor/transactions", protectAdmin, getVendorTransactions);
router.get("/vendor/withdrawals", protectAdmin, getVendorWithdrawals);
router.post("/vendor/withdrawals", protectAdmin, createVendorWithdrawal);
router.get("/vendor/refunds", protectAdmin, getVendorRefunds);
router.get("/vendor/commission-report", protectAdmin, getSuperAdminCommissionReport);
router.delete("/vendor/transactions/:id", protectAdmin, deleteVendorTransaction);
router.patch("/vendor/withdrawals/:id/mark-paid", protectAdmin, requireSuperAdmin, markWithdrawalPaid);

export default router;

