import express from "express";
import { getActiveOffers } from "../../controllers/offer.controller.js";

const router = express.Router();

router.get("/active", getActiveOffers);

export default router;
