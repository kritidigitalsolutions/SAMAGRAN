import express from "express";
import { vendorSignup } from "../../controllers/vendor/vendor.auth.controller.js";

const router = express.Router();

router.post("/signup", vendorSignup);

export default router;
