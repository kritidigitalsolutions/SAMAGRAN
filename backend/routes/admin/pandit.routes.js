import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { getAllPanditsForAdmin } from "../../controllers/admin/pandit.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllPanditsForAdmin);

export default router;
