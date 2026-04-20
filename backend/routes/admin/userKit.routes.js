import express from "express";

const router = express.Router();
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
	getAllUserKitsForAdmin,
	deleteUserKitByAdmin,
} from "../../controllers/admin/userKit.controller.js";


router.get("/all", protectAdmin, getAllUserKitsForAdmin);
router.delete("/:userKitId", protectAdmin, deleteUserKitByAdmin);


export default router;