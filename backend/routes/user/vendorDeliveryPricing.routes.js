import express from "express";
import protect from "../../middleware/auth.middleware.js";

import {
  getUserDeliveryCharge
} from "../../controllers/deliveryPricing.controller.js";

const router = express.Router();

router.get(
  "/my-delivery-price",
  protect,
  getUserDeliveryCharge
);

export default router;