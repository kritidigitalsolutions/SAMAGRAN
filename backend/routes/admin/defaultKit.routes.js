import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createDefaultKit,
  deleteDefaultKit,
  getAdminDefaultKitById,
  getAdminDefaultKits,
  updateDefaultKit,
} from "../../controllers/admin/defaultKit.controller.js";

const router = express.Router();

router.post("/", protectAdmin, upload.single("imageFile"), createDefaultKit);
router.get("/", protectAdmin, getAdminDefaultKits);
router.get("/:id", protectAdmin, getAdminDefaultKitById);
router.put("/:id", protectAdmin, upload.single("imageFile"), updateDefaultKit);
router.delete("/:id", protectAdmin, deleteDefaultKit);

export default router;
