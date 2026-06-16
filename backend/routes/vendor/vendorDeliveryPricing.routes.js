import express from "express";
import { protectVendor } from "../../middleware/vendor.middleware.js";

import {
  addPricing,
  getPricingList,
  updatePricing,
  deletePricing
} from "../../controllers/admin/deliveryPricing.controller.js";

const router = express.Router();

router.post("/add", protectVendor, addPricing);

router.get("/list", protectVendor, getPricingList);

router.put("/update/:id", protectVendor, updatePricing);

router.delete("/delete/:id", protectVendor, deletePricing);

export default router;