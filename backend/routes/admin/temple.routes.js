import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createtemple,
  deletetemple,
  getAlltemplesForAdmin,
  updatetemple,
} from "../../controllers/admin/temple.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAlltemplesForAdmin);
router.post("/", protectAdmin, upload.single("imageFile"), createtemple);
router.put("/:id", protectAdmin, upload.single("imageFile"), updatetemple);
router.delete("/:id", protectAdmin, deletetemple);

export default router;
