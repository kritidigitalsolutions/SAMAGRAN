// routes/admin.routes.js
import express from "express";
import { adminLogin } from "../../controllers/admin auth/admin.auth.controller.js";

const router = express.Router();

router.post("/login", adminLogin);

export default router;