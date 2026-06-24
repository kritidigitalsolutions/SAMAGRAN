import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";

import {
  addPricing,
  getPricingList,
  updatePricing,
  deletePricing
} from "../../controllers/admin/deliveryPricing.controller.js";

const router = express.Router();

router.post("/add", protectAdmin, addPricing);

router.get("/list", protectAdmin, getPricingList);

router.put("/update/:id", protectAdmin, updatePricing);

router.delete("/delete/:id", protectAdmin, deletePricing);

export default router;