import express from "express";

const router = express.Router();
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { getAllUserKitsForAdmin } from "../../controllers/admin/userKit.controller.js";


router.get("/all", protectAdmin, getAllUserKitsForAdmin);


export default router;