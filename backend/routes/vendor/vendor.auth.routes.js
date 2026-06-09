import express from "express";
import { vendorLogin } from "../../controllers/vendor/vendor.auth.controller.js";

const router = express.Router();

router.post("/login", vendorLogin);

export default router;

