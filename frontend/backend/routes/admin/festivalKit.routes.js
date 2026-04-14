import express from "express";
import {
  createKit,
  getAllKits,
  getSingleKit,
  deleteKit,
  updateKit
} from "../../controllers/admin/festivalKit.controller.js";

import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";

const router = express.Router();

router.post("/", protectAdmin, upload.single("imageFile"), createKit);
router.get("/", protectAdmin,getAllKits);
router.get("/:id", protectAdmin,getSingleKit);
router.put("/:id", protectAdmin, upload.single("imageFile"), updateKit);
router.delete("/:id", protectAdmin,deleteKit);

export default router;
