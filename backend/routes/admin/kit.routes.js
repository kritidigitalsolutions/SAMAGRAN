import express from "express";
import { upload } from "../../middleware/upload.js";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  createDefaultKit,
  deleteDefaultKit,
  getAdminDefaultKitById,
  getAdminDefaultKits,
  updateDefaultKit,
} from "../../controllers/admin/defaultKit.controller.js";
import {
  createKit,
  deleteKit,
  getAllKits,
  getSingleKit,
  updateKit,
} from "../../controllers/admin/festivalKit.controller.js";

const router = express.Router();

// Admin kits (default + special)
router.post("/kits/default", protectAdmin, upload.single("imageFile"), createDefaultKit);
router.get("/kits/default", protectAdmin, getAdminDefaultKits);
router.get("/kits/default/:id", protectAdmin, getAdminDefaultKitById);
router.put("/kits/default/:id", protectAdmin, upload.single("imageFile"), updateDefaultKit);
router.delete("/kits/default/:id", protectAdmin, deleteDefaultKit);

router.post("/kits/special", protectAdmin, upload.single("imageFile"), createKit);
router.get("/kits/special", protectAdmin, getAllKits);
router.get("/kits/special/:id", protectAdmin, getSingleKit);
router.put("/kits/special/:id", protectAdmin, upload.single("imageFile"), updateKit);
router.delete("/kits/special/:id", protectAdmin, deleteKit);

export default router;
