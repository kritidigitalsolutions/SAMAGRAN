import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createRitual,
  deleteRitual,
  getPendingCustomSamagriItems,
  getAllRitualsForAdmin,
  reviewCustomSamagriItem,
  updateRitual,
} from "../../controllers/admin/ritual.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllRitualsForAdmin);
router.get("/custom-samagri", protectAdmin, getPendingCustomSamagriItems);
router.post("/", protectAdmin, upload.single("imageFile"), createRitual);
router.put("/:id", protectAdmin, upload.single("imageFile"), updateRitual);
router.patch("/custom-samagri/:panditId/:ritualId/:itemId", protectAdmin, reviewCustomSamagriItem);
router.delete("/:id", protectAdmin, deleteRitual);

export default router;
