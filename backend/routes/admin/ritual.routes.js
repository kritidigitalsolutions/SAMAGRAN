import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createRitual,
  deleteRitual,
  getAllRitualsForAdmin,
  updateRitual,
} from "../../controllers/admin/ritual.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllRitualsForAdmin);
router.post("/", protectAdmin, upload.single("imageFile"), createRitual);
router.put("/:id", protectAdmin, upload.single("imageFile"), updateRitual);
router.delete("/:id", protectAdmin, deleteRitual);

export default router;
