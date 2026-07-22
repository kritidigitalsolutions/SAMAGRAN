import express from "express";
import { submitPartnerInquiry } from "../controllers/partner.controller.js";

const router = express.Router();

// Public endpoint for "Partner With Us" form submission
router.post("/partner-with-us", submitPartnerInquiry);

export default router;
