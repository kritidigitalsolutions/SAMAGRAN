import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  getPanditPayoutAlerts,
  createPanditPayout,
  getPanditPayoutHistory,
} from "../../controllers/admin/panditPayout.controller.js";

const router = express.Router();

router.get("/pandit-payouts/alerts", protectAdmin, getPanditPayoutAlerts);
router.post("/pandit-payouts", protectAdmin, createPanditPayout);
router.get("/pandit-payouts/history", protectAdmin, getPanditPayoutHistory);

export default router;
