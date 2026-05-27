import express from "express";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import {
  getPanditAvailabilityForPandit,
  upsertPanditAvailability,
} from "../../controllers/panditAvailability.controller.js";

const router = express.Router();

router.get("/", protectPandit, getPanditAvailabilityForPandit);
router.post("/", protectPandit, upsertPanditAvailability);

export default router;
